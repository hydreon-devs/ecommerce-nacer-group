-- Migración `create_panel_sale` (aplicada el 2026-10-13 al proyecto de Supabase
-- compartido con el asistente). Copia de referencia: la fuente de verdad es el
-- historial de migraciones de la base. Diseño en
-- `2026-10-13-nuevo-pedido-manual-design.md`.
--
-- Venta manual cargada desde el panel (/admin/pedidos/nuevo): un asesor
-- registra una venta que ya cobró por fuera del asistente y de la tienda.
-- Encadena las funciones que ya usa el asistente (reserve_variant,
-- set_delivery, confirm_order, create_sale_form_token, submit_sale_details)
-- dentro de un solo bloque: si cualquiera responde ok = false, se deshace todo
-- (pedido, reservas, stock y número de pedido) y se devuelve ese error con el
-- paso en que ocurrió. No modifica ninguna función existente.
create or replace function public.create_panel_sale(p_payload jsonb)
 returns jsonb
 language plpgsql
 set search_path to public
as $function$
declare
  v_payload  jsonb := coalesce(p_payload, '{}'::jsonb);
  v_details  jsonb := coalesce(p_payload -> 'details', '{}'::jsonb);
  v_lines    jsonb := p_payload -> 'lines';
  -- reserve_variant reusa el pedido abierto del chat. Con un identificador
  -- propio la venta del panel nunca cae en el carrito de WhatsApp del cliente.
  v_chat     constant text := 'panel:' || gen_random_uuid()::text;
  v_source   text := lower(btrim(coalesce(v_payload ->> 'payment_source', '')));
  v_ref      text := nullif(btrim(coalesce(v_payload ->> 'payment_ref', '')), '');
  v_method   text := lower(btrim(coalesce(v_payload ->> 'delivery_method', '')));
  v_address  text := nullif(btrim(coalesce(v_payload ->> 'delivery_address', '')), '');
  v_zone     text := btrim(coalesce(v_payload ->> 'delivery_zone', ''));
  v_advisor  text := nullif(left(btrim(coalesce(v_payload ->> 'advisor_name', '')), 100), '');
  v_occasion text := nullif(btrim(coalesce(v_payload ->> 'occasion', '')), '');
  v_date_txt text := nullif(btrim(coalesce(v_payload ->> 'desired_delivery_date', '')), '');
  v_date     date;
  v_distance integer;
  v_campos   text[] := '{}';
  v_line     jsonb;
  v_order    uuid;
  v_res      jsonb;
  v_err      jsonb;
  v_numero   text;
  v_total    numeric;
  v_check    text;
begin
  -- Validaciones sin efectos: nada se escribe hasta que todas pasan.
  if v_advisor is null then
    return jsonb_build_object('ok', false, 'error', 'VENDEDOR_REQUERIDO', 'paso', 'datos');
  end if;

  if v_source not in ('transferencia', 'mercadopago') then
    return jsonb_build_object('ok', false, 'error', 'ORIGEN_INVALIDO', 'paso', 'pago',
                              'origen', v_source);
  end if;

  if v_method not in ('domicilio', 'tienda') then
    return jsonb_build_object('ok', false, 'error', 'METODO_INVALIDO', 'paso', 'entrega');
  end if;

  if jsonb_typeof(v_lines) is distinct from 'array' then
    return jsonb_build_object('ok', false, 'error', 'PEDIDO_SIN_LINEAS', 'paso', 'productos');
  end if;
  if jsonb_array_length(v_lines) = 0 then
    return jsonb_build_object('ok', false, 'error', 'PEDIDO_SIN_LINEAS', 'paso', 'productos');
  end if;

  for v_line in select value from jsonb_array_elements(v_lines) loop
    if nullif(btrim(coalesce(v_line ->> 'variant_sku', '')), '') is null
       or coalesce(v_line ->> 'qty', '') !~ '^[1-9][0-9]{0,3}$'
       or coalesce(v_line ->> 'option_qty', '1') !~ '^[1-9][0-9]{0,3}$' then
      return jsonb_build_object('ok', false, 'error', 'LINEA_INVALIDA', 'paso', 'productos',
                                'linea', v_line);
    end if;
  end loop;

  if v_method = 'domicilio' then
    if v_address is null then
      return jsonb_build_object('ok', false, 'error', 'DIRECCION_REQUERIDA', 'paso', 'entrega');
    end if;
    if v_zone !~ '^[1-9][0-9]?$' then
      return jsonb_build_object('ok', false, 'error', 'ZONA_INVALIDA', 'paso', 'entrega');
    end if;

    -- El asesor elige la zona que cobró, no los kilómetros. La zona N es el
    -- N-ésimo tramo de delivery_tariffs y se guarda su distancia mínima, que
    -- set_delivery convierte de vuelta en la tarifa de ese tramo.
    select (z.km_from * 1000)::integer into v_distance
      from (select t.km_from, row_number() over (order by t.km_from) as zona
              from delivery_tariffs t) z
     where z.zona = v_zone::integer;

    if not found then
      return jsonb_build_object('ok', false, 'error', 'ZONA_INVALIDA', 'paso', 'entrega');
    end if;
  else
    v_address := null;
  end if;

  if v_date_txt is not null then
    if v_date_txt !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
      return jsonb_build_object('ok', false, 'error', 'FECHA_INVALIDA', 'paso', 'entrega');
    end if;
    begin
      v_date := v_date_txt::date;
    exception when others then
      return jsonb_build_object('ok', false, 'error', 'FECHA_INVALIDA', 'paso', 'entrega');
    end;
  end if;

  -- El formulario del cliente no exige nada; el del panel sí exige saber a
  -- quién se le vendió. El formato del resto lo valida submit_sale_details.
  if nullif(btrim(coalesce(v_details ->> 'buyer_name', '')), '') is null then
    v_campos := v_campos || 'buyer_name'::text;
  end if;
  if coalesce(normalize_phone(v_details ->> 'buyer_phone'), '') !~ '^[0-9]{7,15}$' then
    v_campos := v_campos || 'buyer_phone'::text;
  end if;
  if cardinality(v_campos) > 0 then
    return jsonb_build_object('ok', false, 'error', 'DATOS_INVALIDOS', 'paso', 'datos',
                              'campos', to_jsonb(v_campos));
  end if;

  -- Todo o nada: el bloque es una subtransacción y la excepción PS001 la
  -- deshace completa. v_err conserva el error porque las variables no se
  -- revierten.
  begin
    for v_line in select value from jsonb_array_elements(v_lines) loop
      v_res := reserve_variant(
        btrim(v_line ->> 'variant_sku'),
        (v_line ->> 'qty')::integer,
        '[]'::jsonb,
        v_chat,
        interval '10 minutes',
        nullif(btrim(coalesce(v_line ->> 'option_name', '')), ''),
        coalesce((v_line ->> 'option_qty')::integer, 1));

      if not coalesce((v_res ->> 'ok')::boolean, false) then
        v_err := v_res || jsonb_build_object('paso', 'productos',
                                             'variant_sku', v_line ->> 'variant_sku');
        raise exception 'create_panel_sale: venta deshecha' using errcode = 'PS001';
      end if;

      v_order := (v_res ->> 'order_id')::uuid;
    end loop;

    -- Antes de confirmar: confirm_order conserva la ocasión y la fecha que el
    -- pedido ya traiga.
    update orders o
       set advisor_name          = v_advisor,
           occasion              = v_occasion,
           desired_delivery_date = v_date,
           updated_at            = now()
     where o.id = v_order;

    v_res := set_delivery(v_chat, v_method, v_address, v_distance);
    if not coalesce((v_res ->> 'ok')::boolean, false) then
      v_err := v_res || jsonb_build_object('paso', 'entrega');
      raise exception 'create_panel_sale: venta deshecha' using errcode = 'PS001';
    end if;

    -- Sin monto: el asesor ya verificó el pago, así que queda registrado el
    -- total del pedido. confirm_order descuenta stock, marca 'pagado' y
    -- arranca el cumplimiento en 'en_construccion'.
    v_res := confirm_order(v_order, v_source, v_ref, null);
    if not coalesce((v_res ->> 'ok')::boolean, false) then
      v_err := v_res || jsonb_build_object('paso', 'pago');
      raise exception 'create_panel_sale: venta deshecha' using errcode = 'PS001';
    end if;

    v_res := create_sale_form_token(v_order);
    if not coalesce((v_res ->> 'ok')::boolean, false) then
      v_err := v_res || jsonb_build_object('paso', 'datos');
      raise exception 'create_panel_sale: venta deshecha' using errcode = 'PS001';
    end if;

    v_res := submit_sale_details((v_res ->> 'token')::uuid, v_details);
    if not coalesce((v_res ->> 'ok')::boolean, false) then
      v_err := v_res || jsonb_build_object('paso', 'datos');
      raise exception 'create_panel_sale: venta deshecha' using errcode = 'PS001';
    end if;
  exception
    when sqlstate 'PS001' then
      return v_err;
    when check_violation then
      -- Un valor fuera de una lista cerrada (por ejemplo la ocasión).
      get stacked diagnostics v_check = constraint_name;
      return jsonb_build_object('ok', false, 'error', 'DATOS_INVALIDOS', 'paso', 'datos',
                                'restriccion', v_check);
  end;

  select o.human_number, o.grand_total into v_numero, v_total
    from orders o where o.id = v_order;

  return jsonb_build_object('ok', true,
                            'order_id', v_order,
                            'numero_pedido', v_numero,
                            'total', v_total);
end;
$function$;

comment on function public.create_panel_sale(jsonb) is
  'Venta manual desde el panel: reserva, entrega, pago y datos de la venta en una sola transacción. Solo service_role.';

-- Igual que las demás funciones de pago: solo el servidor del panel la llama.
revoke all on function public.create_panel_sale(jsonb) from public, anon, authenticated;
grant execute on function public.create_panel_sale(jsonb) to service_role;
