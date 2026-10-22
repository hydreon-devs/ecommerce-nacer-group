-- Migración `create_web_order` (PENDIENTE de aplicar al proyecto de Supabase
-- compartido con el asistente; requiere la aprobación del dueño). Copia de
-- referencia: la fuente es asistente-nacer-group/db/migrations/041_create_web_order.sql
-- y, una vez aplicada, el historial de migraciones de la base. Diseño en
-- `2026-10-21-cart-and-web-checkout-design.md`, sección «Slice 3 detail».
-- Prueba: asistente-nacer-group/db/tests/rf59_create_web_order_test.sql.
--
-- 041 create_web_order
-- Pedido de la tienda web (checkout del ecommerce, paso «Tus datos»). Diseno:
-- docs/plans/2026-10-21-cart-and-web-checkout-design.md del repositorio del
-- ecommerce, seccion «Slice 3 detail». Copia de referencia en ese repositorio:
-- docs/plans/2026-10-22-create-web-order.sql.
--
-- Que agrega:
--   1. normalize_sale_details(p_payload): la normalizacion y validacion de
--      formato de los campos de sale_details (spec 015 RF-36, RF-37 y §3.6),
--      extraida tal cual de submit_sale_details. Devuelve {campos, valores}.
--   2. submit_sale_details: mismo comportamiento, misma firma, mismas salidas.
--      Solo delega en normalize_sale_details para que el formulario de
--      WhatsApp y la web no puedan separarse.
--   3. _web_order_result(p_chat, p_reused, p_line_order): arma la respuesta
--      de exito de un pedido web abierto, o INTENTO_CERRADO.
--   4. create_web_order(p_payload): crea en UNA transaccion el pedido web
--      pendiente de pago: reservas (TTL 60 min), ocasion, fecha, entrega,
--      payment_status = 'pendiente', payment_source = 'mercadopago' y la fila
--      de sale_details ya enviada.
--
-- Por que una RPC nueva y no encadenar las que existen:
--   * create_sale_form_token rechaza pedidos sin pagar (PEDIDO_NO_PAGADO), y el
--     comprador web es anonimo: sus datos se piden ANTES de pagar.
--   * Llamadas encadenadas desde el servidor no son atomicas: una falla a
--     mitad dejaria reservas y un numero de pedido gastado.
--   * set_discovery_context escribe conversations; un pedido web no tiene
--     conversacion. Ocasion y fecha van directo al pedido, como en
--     create_panel_sale.
--
-- Invariantes:
--   * Nunca confia en precios del cliente: el payload no trae ninguno y los
--     montos se leen de reservations/orders despues de reservar.
--   * Nunca llama a confirm_order ni marca comprobante_recibido. El pago lo
--     confirma solo el webhook de n8n tras verificar con Mercado Pago.
--   * Todo o nada: cualquier falla deshace pedido, reservas, cancelacion del
--     intento anterior, sale_details y numero de pedido (patron PS001 de
--     create_panel_sale, mas check_violation).
--   * chat_id = 'web:' || attempt_id. Idempotente por attempt_id.
--
-- Bloqueos: un bloqueo consultivo de transaccion por chat 'web:<attempt_id>'
-- pone en fila los envios repetidos del mismo intento. Despues, igual que
-- create_panel_sale (regla de 038): primero el pedido
-- anterior (cancel_order), despues la union de stock_items de todas las
-- lineas en una sola sentencia ordenada por id, y solo entonces reserve_variant.
--
-- Se aplica con mcp__supabase__apply_migration como `create_web_order`.
-- Antes de aplicar: comparar pg_get_functiondef de submit_sale_details en vivo
-- con 015_borrador_del_formulario.sql §2. Si difieren, NO aplicar: esta
-- migracion reescribe esa funcion a partir de la version del repositorio.
-- Prueba: rf59. Regresion por el cambio en submit_sale_details: rf19, rf32,
-- rf37, rf45 y rf46.
--
-- Reversion (una transaccion):
--   drop function if exists public.create_web_order(jsonb);
--   drop function if exists public._web_order_result(text, boolean, uuid[]);
--   -- submit_sale_details: volver a crear con el texto de
--   -- 015_borrador_del_formulario.sql §2 (no depende de la funcion nueva).
--   drop function if exists public.normalize_sale_details(jsonb);
-- Los pedidos web ya creados quedan como datos (chat_id 'web:%').

-- ---------------------------------------------------------------------------
-- 1. normalize_sale_details
-- ---------------------------------------------------------------------------
-- Mismo codigo que validaba dentro de submit_sale_details, sin cambios de
-- orden: `campos` sale en el mismo orden que antes. No exige campos
-- obligatorios; eso lo decide cada quien la llama.
create or replace function public.normalize_sale_details(p_payload jsonb)
returns jsonb
language plpgsql
stable
set search_path to ''
as $function$
declare
  v_payload  jsonb   := coalesce(p_payload, '{}'::jsonb);
  v_may_call boolean;
  v_invoice  boolean;
  v_campos   text[]  := '{}';
  v_txt      jsonb   := '{}'::jsonb;
  v_limites  constant jsonb := '{
    "buyer_name": 150, "recipient_name": 150, "invoice_legal_name": 150,
    "delivery_address_exact": 200, "delivery_unit": 120, "neighborhood": 120,
    "city": 120, "building_name": 120, "card_from": 100, "card_to": 100,
    "card_message": 1000, "special_notes": 1000}';
  v_campo    text;
  v_valor    text;
  v_buyer_phone     text;
  v_recipient_phone text;
  v_buyer_email     text;
  v_invoice_email   text;
  v_tax_id          text;
  v_referral        text;
begin
  -- Los campos de opcion fija llegan del formulario como texto ("Si" / "No").
  -- Se normalizan aqui y no solo en el flujo: la base es la que decide.
  v_may_call := case lower(btrim(coalesce(v_payload ->> 'may_call_recipient', '')))
                  when 'si' then true when 'sí' then true when 's' then true
                  when 'true' then true when 'yes' then true
                  when 'no' then false when 'n' then false when 'false' then false
                  else null end;

  v_invoice  := case lower(btrim(coalesce(v_payload ->> 'wants_invoice', '')))
                  when 'si' then true when 'sí' then true when 's' then true
                  when 'true' then true when 'yes' then true
                  when 'no' then false when 'n' then false when 'false' then false
                  else null end;

  -- Spec 015 RF-36: normalizar antes de validar.
  v_buyer_phone     := public.normalize_phone(v_payload ->> 'buyer_phone');
  v_recipient_phone := public.normalize_phone(v_payload ->> 'recipient_phone');
  v_buyer_email     := nullif(lower(btrim(coalesce(v_payload ->> 'buyer_email', ''))), '');
  v_invoice_email   := nullif(lower(btrim(coalesce(v_payload ->> 'invoice_email', ''))), '');
  v_tax_id          := nullif(regexp_replace(btrim(coalesce(v_payload ->> 'invoice_tax_id', '')), '[\s\.]', '', 'g'), '');
  v_referral        := nullif(btrim(coalesce(v_payload ->> 'referral_source', '')), '');

  -- Spec 015 RF-37: los mismos limites que los CHECK de la tabla. Se validan
  -- aqui para responder con la lista de campos en vez de un error de Postgres.
  for v_campo in select jsonb_object_keys(v_limites) loop
    v_valor := nullif(btrim(coalesce(v_payload ->> v_campo, '')), '');
    v_txt := v_txt || jsonb_build_object(v_campo, v_valor);
    if char_length(v_valor) > (v_limites ->> v_campo)::int then
      v_campos := v_campos || v_campo;
    end if;
  end loop;

  if v_buyer_phone !~ '^[0-9]{7,15}$' then
    v_campos := v_campos || 'buyer_phone'::text;
  end if;
  if v_recipient_phone !~ '^[0-9]{7,15}$' then
    v_campos := v_campos || 'recipient_phone'::text;
  end if;
  if char_length(v_buyer_email) > 254 or v_buyer_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    v_campos := v_campos || 'buyer_email'::text;
  end if;
  if char_length(v_invoice_email) > 254 or v_invoice_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    v_campos := v_campos || 'invoice_email'::text;
  end if;
  if v_tax_id !~ '^[0-9]{5,15}(-[0-9])?$' then
    v_campos := v_campos || 'invoice_tax_id'::text;
  end if;
  if v_referral not in ('Instagram', 'Facebook', 'Un conocido', 'Google', 'Otro') then
    v_campos := v_campos || 'referral_source'::text;
  end if;

  -- valores: lo que se guardaria, ya normalizado. Un campo ausente o en
  -- blanco es null; los dos si/no son booleanos o null.
  return jsonb_build_object(
    'campos', to_jsonb(v_campos),
    'valores', v_txt || jsonb_build_object(
      'buyer_phone',        v_buyer_phone,
      'recipient_phone',    v_recipient_phone,
      'buyer_email',        v_buyer_email,
      'invoice_email',      v_invoice_email,
      'invoice_tax_id',     v_tax_id,
      'referral_source',    v_referral,
      'may_call_recipient', v_may_call,
      'wants_invoice',      v_invoice));
end;
$function$;

comment on function public.normalize_sale_details(jsonb) is
  'Spec 015 RF-36/RF-37. Normaliza y valida el formato de los campos de sale_details. {campos: [invalidos], valores: {normalizados}}. No escribe. La usan submit_sale_details y create_web_order.';

-- ---------------------------------------------------------------------------
-- 2. submit_sale_details: mismo comportamiento que 015_borrador_del_formulario
-- ---------------------------------------------------------------------------
create or replace function public.submit_sale_details(p_token uuid, p_payload jsonb)
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare
  v_id       uuid;
  v_order    uuid;
  v_chat     text;
  v_pagado   boolean;
  v_numero   text;
  v_payload  jsonb   := coalesce(p_payload, '{}'::jsonb);
  v_norm     jsonb;
  v_val      jsonb;
  v_may_call boolean;
  v_invoice  boolean;
  v_campos   text[];
  v_campo    text;
  v_valor    text;
  v_draft           jsonb   := '{}'::jsonb;
  v_draft_keys      constant text[] := array[
    'buyer_name', 'buyer_phone', 'buyer_email',
    'delivery_address_exact', 'delivery_unit', 'neighborhood', 'city', 'building_name',
    'recipient_name', 'recipient_phone',
    'card_from', 'card_to', 'card_message', 'special_notes',
    'invoice_legal_name', 'invoice_tax_id', 'invoice_email', 'referral_source'];
begin
  select sd.id, sd.order_id
    into v_id, v_order
    from public.sale_details sd
   where sd.form_token = p_token
     and sd.submitted_at is null
     and sd.token_expires_at > now()
     for update;

  -- UN SOLO codigo para inexistente, vencido y ya usado, a proposito: el
  -- formulario es publico y distinguirlos le confirma a un tercero que ese
  -- identificador existio (RF-33, plan.md 2.3). Va antes de validar formatos
  -- para que un token falso tampoco reciba la lista de campos.
  if not found then
    return jsonb_build_object(
      'ok', false, 'error', 'TOKEN_INVALIDO',
      'mensaje', 'Este enlace ya no esta disponible.');
  end if;

  -- Spec 015 RF-36/RF-37: normalizacion y formato en una sola funcion,
  -- compartida con create_web_order.
  v_norm     := public.normalize_sale_details(v_payload);
  v_val      := v_norm -> 'valores';
  v_may_call := (v_val ->> 'may_call_recipient')::boolean;
  v_invoice  := (v_val ->> 'wants_invoice')::boolean;
  v_campos   := array(select c.campo
                        from jsonb_array_elements_text(v_norm -> 'campos')
                             with ordinality as c(campo, n)
                       order by c.n);

  -- RF-38: el enlace sigue vivo. Solo se responde despues de validar el token,
  -- asi que la lista de campos no le dice nada a quien no tiene un enlace real.
  if cardinality(v_campos) > 0 then
    -- Spec 015 RF-43: guarda como borrador SOLO lo que paso, tal como el
    -- cliente lo escribio (sin normalizar), para devolverselo en la pagina de
    -- correccion. Los dos si/no se guardan como booleano. Reemplaza el
    -- borrador anterior: lo ultimo que el cliente envio es la verdad.
    foreach v_campo in array v_draft_keys loop
      v_valor := nullif(btrim(coalesce(v_payload ->> v_campo, '')), '');
      if v_valor is not null and not (v_campo = any (v_campos)) then
        v_draft := v_draft || jsonb_build_object(v_campo, v_valor);
      end if;
    end loop;
    if v_may_call is not null then
      v_draft := v_draft || jsonb_build_object('may_call_recipient', v_may_call);
    end if;
    if v_invoice is not null then
      v_draft := v_draft || jsonb_build_object('wants_invoice', v_invoice);
    end if;

    update public.sale_details sd
       set draft          = v_draft,
           draft_saved_at = now()
     where sd.id = v_id;

    return jsonb_build_object(
      'ok', false, 'error', 'DATOS_INVALIDOS',
      'campos', to_jsonb(v_campos),
      'borrador_guardado', v_draft <> '{}'::jsonb,
      'mensaje', 'Hay datos con formato invalido.');
  end if;

  update public.sale_details sd set
    buyer_name             = v_val ->> 'buyer_name',
    buyer_phone            = v_val ->> 'buyer_phone',
    buyer_email            = v_val ->> 'buyer_email',

    delivery_address_exact = v_val ->> 'delivery_address_exact',
    delivery_unit          = v_val ->> 'delivery_unit',
    neighborhood           = v_val ->> 'neighborhood',
    city                   = v_val ->> 'city',
    building_name          = v_val ->> 'building_name',

    recipient_name         = v_val ->> 'recipient_name',
    recipient_phone        = v_val ->> 'recipient_phone',
    may_call_recipient     = v_may_call,

    card_from              = v_val ->> 'card_from',
    card_to                = v_val ->> 'card_to',
    card_message           = v_val ->> 'card_message',
    special_notes          = v_val ->> 'special_notes',

    wants_invoice          = v_invoice,
    invoice_legal_name     = v_val ->> 'invoice_legal_name',
    invoice_tax_id         = v_val ->> 'invoice_tax_id',
    invoice_email          = v_val ->> 'invoice_email',

    referral_source        = v_val ->> 'referral_source',

    submitted_at           = now(),

    -- Spec 015 RF-44: el borrador se borra en el mismo update que guarda.
    draft                  = null,
    draft_saved_at         = null
  where sd.id = v_id;

  select o.chat_id, o.status = 'pagado', o.human_number
    into v_chat, v_pagado, v_numero
    from public.orders o
   where o.id = v_order;

  -- Se devuelve lo minimo que el flujo necesita: a quien confirmarle por
  -- WhatsApp y si hay que avisarle al operador. Ningun dato personal del
  -- tercero sale de aqui (RNF-2).
  -- Spec 018 RF-31: pago_aprobado deja al aviso de factura decir si el dinero
  -- ya entro o si la transferencia sigue por verificar.
  -- Spec 017 RF-41: numero_pedido es el `human_number` del pedido, para el
  -- mensaje de agradecimiento. Va aparte de pago_aprobado a proposito: el
  -- numero identifica el PEDIDO, no el pago.
  return jsonb_build_object(
    'ok', true,
    'order_id', v_order,
    'chat_id', v_chat,
    'wants_invoice', coalesce(v_invoice, false),
    'pago_aprobado', coalesce(v_pagado, false),
    'numero_pedido', v_numero);
end;
$function$;

-- ---------------------------------------------------------------------------
-- 3. _web_order_result
-- ---------------------------------------------------------------------------
-- Respuesta del pedido web de un chat 'web:<attempt_id>'. null si el chat no
-- tiene pedido. INTENTO_CERRADO si el pedido no esta abierto o si sus reservas
-- ya vencieron (aunque expire_reservations no haya pasado todavia): un pedido
-- asi no se puede cobrar, y el cliente debe abrir un intento nuevo.
-- Montos en pesos enteros, leidos de reservations y orders (grand_total es
-- columna generada). p_line_order ordena las lineas como llegaron.
create or replace function public._web_order_result(
  p_chat       text,
  p_reused     boolean,
  p_line_order uuid[] default null::uuid[])
returns jsonb
language plpgsql
stable
set search_path to ''
as $function$
declare
  v_order  uuid;
  v_status text;
  v_numero text;
  v_sub    numeric;
  v_fee    numeric;
  v_grand  numeric;
  v_exp    timestamptz;
  v_lines  jsonb;
begin
  select o.id, o.status, o.human_number, o.total_price, o.delivery_fee, o.grand_total
    into v_order, v_status, v_numero, v_sub, v_fee, v_grand
    from public.orders o
   where o.chat_id = p_chat
   order by (o.status = 'abierto') desc, o.created_at desc
   limit 1;

  if not found then
    return null;
  end if;

  select min(r.expires_at) into v_exp
    from public.reservations r
   where r.order_id = v_order and r.status = 'activa';

  if v_status <> 'abierto' or v_exp is null or v_exp <= now() then
    return jsonb_build_object(
      'ok', false, 'error', 'INTENTO_CERRADO', 'paso', 'intento',
      'estado', case when v_status = 'abierto' then 'vencido' else v_status end);
  end if;

  select jsonb_agg(jsonb_build_object(
           'variant_sku', v.sku,
           'qty',         r.qty,
           'unit_price',  round(r.unit_price)::bigint,
           'total_price', round(r.total_price)::bigint,
           'options',     coalesce((
              select jsonb_agg(jsonb_build_object(
                       'name',       e.value ->> 'nombre',
                       'qty',        (e.value ->> 'qty')::int,
                       'unit_price', round((e.value ->> 'precio')::numeric)::bigint)
                     order by e.n)
                from jsonb_array_elements(coalesce(r.options, '[]'::jsonb))
                     with ordinality as e(value, n)), '[]'::jsonb))
         order by array_position(p_line_order, r.id) nulls last, r.created_at, r.id)
    into v_lines
    from public.reservations r
    join public.product_variants v on v.id = r.variant_id
   where r.order_id = v_order and r.status = 'activa';

  return jsonb_build_object(
    'ok',           true,
    'order_id',     v_order,
    'human_number', v_numero,
    'reutilizado',  p_reused,
    'expires_at',   v_exp,
    'subtotal',     round(v_sub)::bigint,
    'delivery_fee', round(coalesce(v_fee, 0))::bigint,
    'grand_total',  round(v_grand)::bigint,
    'lines',        coalesce(v_lines, '[]'::jsonb));
end;
$function$;

comment on function public._web_order_result(text, boolean, uuid[]) is
  'Interna de create_web_order. Respuesta de exito del pedido web abierto de un chat, INTENTO_CERRADO si no se puede cobrar, o null si no existe. Solo lee.';

-- ---------------------------------------------------------------------------
-- 4. create_web_order
-- ---------------------------------------------------------------------------
create or replace function public.create_web_order(p_payload jsonb)
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare
  v_uuid_re   constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  -- Misma lista que set_discovery_context y orders_occasion_check (spec 019).
  v_validas   constant text[] := array[
    'cumpleaños', 'condolencias', 'grados', 'felicitaciones',
    'nacimiento/bautizo', 'boda', 'aniversario', 'recuperación',
    'fecha especial', 'navidad', 'laboral', 'otro'];
  v_payload   jsonb := coalesce(p_payload, '{}'::jsonb);
  v_lines     jsonb := v_payload -> 'lines';
  v_delivery  jsonb := v_payload -> 'delivery';
  v_details   jsonb := v_payload -> 'details';
  v_attempt_txt  text := nullif(btrim(coalesce(v_payload ->> 'attempt_id', '')), '');
  v_replaces_txt text := nullif(btrim(coalesce(v_payload ->> 'replaces_attempt_id', '')), '');
  v_attempt   uuid;
  v_replaces  uuid;
  v_chat      text;
  v_old_chat  text;
  v_method    text;
  v_address   text;
  v_dist_txt  text;
  v_distance  integer;
  v_date_txt  text := nullif(btrim(coalesce(v_payload ->> 'desired_delivery_date', '')), '');
  v_date      date;
  v_tomorrow  constant date := (now() at time zone 'America/Bogota')::date + 1;
  v_occasion  text := nullif(btrim(coalesce(v_payload ->> 'occasion', '')), '');
  v_norm      jsonb;
  v_val       jsonb;
  v_campos    text[];
  v_campo     text;
  v_invoice   boolean;
  v_line      jsonb;
  v_opt       jsonb;
  v_variant   uuid;
  v_product   uuid;
  v_opt_id    uuid;
  v_opt_max   integer;
  v_line_opts jsonb;
  v_bad_opt   text;
  v_resolved  jsonb := '[]'::jsonb;
  v_res_ids   uuid[] := '{}';
  v_order     uuid;
  v_res       jsonb;
  v_err       jsonb;
  v_check     text;
  v_race      boolean := false;
begin
  -- 1. Intento ---------------------------------------------------------------
  if v_attempt_txt is null or v_attempt_txt !~ v_uuid_re
     or (v_replaces_txt is not null and v_replaces_txt !~ v_uuid_re) then
    return jsonb_build_object('ok', false, 'error', 'INTENTO_INVALIDO', 'paso', 'intento');
  end if;
  v_attempt  := v_attempt_txt::uuid;
  v_replaces := v_replaces_txt::uuid;
  if v_replaces = v_attempt then
    return jsonb_build_object('ok', false, 'error', 'INTENTO_INVALIDO', 'paso', 'intento');
  end if;

  -- Forma canonica del uuid: el mismo intento en mayusculas es el mismo chat.
  v_chat := 'web:' || v_attempt::text;

  -- Dos envios simultaneos del mismo intento (doble clic, reintento de red) se
  -- atienden en fila. Sin esto, el segundo esperaria el bloqueo de stock del
  -- primero y despues reserve_variant le agregaria lineas al pedido recien
  -- creado. Con la fila, el segundo entra cuando el primero ya confirmo y lo
  -- devuelve como reutilizado en el paso 2.
  perform pg_advisory_xact_lock(hashtextextended(v_chat, 0));

  -- 2. Idempotencia: un intento con pedido devuelve ese pedido sin tocar nada,
  -- antes de validar el resto (una repeticion de manana no debe fallar por la
  -- fecha que ayer era valida).
  v_res := public._web_order_result(v_chat, true);
  if v_res is not null then
    return v_res;
  end if;

  -- 3. Validaciones sin efectos: nada se escribe hasta que todas pasan. ------
  -- 3a. Lineas: forma.
  if jsonb_typeof(v_lines) is distinct from 'array' then
    return jsonb_build_object('ok', false, 'error', 'PEDIDO_SIN_LINEAS', 'paso', 'productos');
  end if;
  if jsonb_array_length(v_lines) = 0 then
    return jsonb_build_object('ok', false, 'error', 'PEDIDO_SIN_LINEAS', 'paso', 'productos');
  end if;

  for v_line in select value from jsonb_array_elements(v_lines) loop
    if jsonb_typeof(v_line) is distinct from 'object'
       or nullif(btrim(coalesce(v_line ->> 'variant_sku', '')), '') is null
       or coalesce(v_line ->> 'qty', '') !~ '^[1-9][0-9]{0,3}$'
       or coalesce(jsonb_typeof(v_line -> 'options'), 'null') not in ('array', 'null') then
      return jsonb_build_object('ok', false, 'error', 'LINEA_INVALIDA', 'paso', 'productos',
                                'linea', v_line);
    end if;
    for v_opt in select value
                   from jsonb_array_elements(case jsonb_typeof(v_line -> 'options')
                                               when 'array' then v_line -> 'options'
                                               else '[]'::jsonb end) loop
      if jsonb_typeof(v_opt) is distinct from 'object'
         or nullif(btrim(coalesce(v_opt ->> 'name', '')), '') is null
         or coalesce(v_opt ->> 'qty', '') !~ '^[1-9][0-9]{0,3}$' then
        return jsonb_build_object('ok', false, 'error', 'LINEA_INVALIDA', 'paso', 'productos',
                                  'linea', v_line);
      end if;
    end loop;
  end loop;

  -- 3b. Entrega.
  if jsonb_typeof(v_delivery) is distinct from 'object' then
    v_delivery := '{}'::jsonb;
  end if;
  v_method   := lower(btrim(coalesce(v_delivery ->> 'method', '')));
  v_address  := nullif(btrim(coalesce(v_delivery ->> 'address', '')), '');
  v_dist_txt := nullif(btrim(coalesce(v_delivery ->> 'distance_m', '')), '');

  if v_method not in ('domicilio', 'tienda') then
    return jsonb_build_object('ok', false, 'error', 'METODO_INVALIDO', 'paso', 'entrega');
  end if;

  if v_method = 'domicilio' then
    if v_address is null then
      return jsonb_build_object('ok', false, 'error', 'DIRECCION_REQUERIDA', 'paso', 'entrega');
    end if;
    -- Mismo codigo que quote_delivery. La distancia la calcula el servidor
    -- de la tienda; la tarifa la decide quote_delivery dentro de set_delivery.
    if v_dist_txt is null or v_dist_txt !~ '^[0-9]{1,9}$' then
      return jsonb_build_object('ok', false, 'error', 'DISTANCIA_INVALIDA', 'paso', 'entrega');
    end if;
    v_distance := v_dist_txt::integer;
  else
    -- Recoger en el taller: sin direccion ni distancia (orders_delivery_coherente).
    v_address  := null;
    v_distance := null;
  end if;

  -- 3c. Fecha: obligatoria, desde manana en Bogota, y un dia con entregas.
  if v_date_txt is null or v_date_txt !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    return jsonb_build_object('ok', false, 'error', 'FECHA_INVALIDA', 'paso', 'entrega');
  end if;
  begin
    v_date := v_date_txt::date;
  exception when others then
    return jsonb_build_object('ok', false, 'error', 'FECHA_INVALIDA', 'paso', 'entrega');
  end;

  if v_date < v_tomorrow or not public.is_delivery_date(v_date) then
    return jsonb_build_object(
      'ok', false, 'error', 'FECHA_SIN_ENTREGA', 'paso', 'entrega',
      'recibido', v_date,
      'proxima_fecha_valida', public.next_delivery_date(greatest(v_date, v_tomorrow)));
  end if;

  -- 3d. Ocasion: opcional; si viene, de la lista cerrada.
  if v_occasion is not null and not (v_occasion = any (v_validas)) then
    return jsonb_build_object('ok', false, 'error', 'OCASION_INVALIDA', 'paso', 'datos',
                              'recibido', v_occasion, 'validas', to_jsonb(v_validas));
  end if;

  -- 3e. Datos de la venta: el mismo formato que submit_sale_details, mas los
  -- obligatorios de la web. La direccion exacta no se pide en la web: la
  -- direccion es la de la entrega (orders.delivery_address). Al recoger en el
  -- taller no se guardan campos de direccion.
  if jsonb_typeof(v_details) is distinct from 'object' then
    v_details := '{}'::jsonb;
  end if;
  v_details := v_details - 'delivery_address_exact';
  if v_method = 'tienda' then
    v_details := v_details - array['delivery_unit', 'neighborhood', 'city', 'building_name'];
  end if;

  v_norm    := public.normalize_sale_details(v_details);
  v_val     := v_norm -> 'valores';
  v_invoice := (v_val ->> 'wants_invoice')::boolean;
  v_campos  := array(select c.campo
                       from jsonb_array_elements_text(v_norm -> 'campos')
                            with ordinality as c(campo, n)
                      order by c.n);

  -- Sin factura, los tres campos de factura se borran y no cuentan como error.
  if v_invoice is false then
    v_campos := array(select c.campo
                        from unnest(v_campos) with ordinality as c(campo, n)
                       where c.campo not in ('invoice_legal_name', 'invoice_tax_id', 'invoice_email')
                       order by c.n);
    v_val := v_val || jsonb_build_object('invoice_legal_name', null,
                                         'invoice_tax_id',     null,
                                         'invoice_email',      null);
  end if;

  -- Obligatorios de la web. Se agregan al final, sin repetir un campo que ya
  -- fallo por formato: `campos` lista TODOS los invalidos, no el primero.
  foreach v_campo in array
      array['buyer_name', 'buyer_phone', 'recipient_name', 'recipient_phone',
            'may_call_recipient', 'wants_invoice']
      || case when v_method = 'domicilio'
              then array['neighborhood', 'city'] else '{}'::text[] end
      || case when v_invoice
              then array['invoice_legal_name', 'invoice_tax_id', 'invoice_email'] else '{}'::text[] end
  loop
    if v_val ->> v_campo is null and not (v_campo = any (v_campos)) then
      v_campos := v_campos || v_campo;
    end if;
  end loop;

  if cardinality(v_campos) > 0 then
    return jsonb_build_object('ok', false, 'error', 'DATOS_INVALIDOS', 'paso', 'datos',
                              'campos', to_jsonb(v_campos));
  end if;

  -- 3f. Lineas: variante vendible y adicionales por nombre (solo lectura).
  -- reserve_variant acepta un solo adicional por nombre; la web manda varios,
  -- asi que se resuelven aqui a {option_id, qty} con la misma comparacion
  -- (sin tildes ni mayusculas) y se validan antes, porque reserve_variant
  -- descarta en silencio un option_id invalido en p_options.
  for v_line in select value from jsonb_array_elements(v_lines) loop
    select v.id, v.product_id into v_variant, v_product
      from public.product_variants v
      join public.products p on p.id = v.product_id
     where v.sku = btrim(v_line ->> 'variant_sku') and v.is_active and p.is_published;

    if not found then
      return jsonb_build_object('ok', false, 'error', 'VARIANTE_NO_DISPONIBLE', 'paso', 'productos',
                                'variant_sku', btrim(v_line ->> 'variant_sku'));
    end if;

    v_line_opts := '[]'::jsonb;
    for v_opt in select value
                   from jsonb_array_elements(case jsonb_typeof(v_line -> 'options')
                                               when 'array' then v_line -> 'options'
                                               else '[]'::jsonb end) loop
      select o.id, o.max_qty into v_opt_id, v_opt_max
        from public.product_options o
       where o.product_id = v_product
         and o.is_active
         and lower(extensions.unaccent(o.name)) = lower(extensions.unaccent(btrim(v_opt ->> 'name')))
       order by o.id
       limit 1;

      if not found then
        return jsonb_build_object('ok', false, 'error', 'OPCION_NO_EXISTE', 'paso', 'productos',
                                  'variant_sku', btrim(v_line ->> 'variant_sku'),
                                  'opcion', btrim(v_opt ->> 'name'));
      end if;

      v_line_opts := v_line_opts || jsonb_build_array(jsonb_build_object(
        'option_id', v_opt_id, 'qty', (v_opt ->> 'qty')::int,
        'max', v_opt_max, 'name', btrim(v_opt ->> 'name')));
    end loop;

    -- El mismo adicional dos veces se suma antes de comparar con el maximo.
    select coalesce(jsonb_agg(jsonb_build_object('option_id', g.option_id, 'qty', g.qty)
                              order by g.option_id), '[]'::jsonb),
           (array_agg(g.name order by g.option_id) filter (where g.qty > g.max_qty))[1]
      into v_line_opts, v_bad_opt
      from (select (e ->> 'option_id')::uuid as option_id,
                   sum((e ->> 'qty')::int)   as qty,
                   max((e ->> 'max')::int)   as max_qty,
                   min(e ->> 'name')         as name
              from jsonb_array_elements(v_line_opts) e
             group by 1) g;

    if v_bad_opt is not null then
      return jsonb_build_object('ok', false, 'error', 'OPCION_EXCEDE_MAXIMO', 'paso', 'productos',
                                'variant_sku', btrim(v_line ->> 'variant_sku'),
                                'opcion', v_bad_opt);
    end if;

    v_resolved := v_resolved || jsonb_build_array(jsonb_build_object(
      'variant_sku', btrim(v_line ->> 'variant_sku'),
      'qty',         (v_line ->> 'qty')::int,
      'options',     v_line_opts));
  end loop;

  -- 4. Escrituras. Todo o nada: el bloque es una subtransaccion y la excepcion
  -- PS001 la deshace completa (tambien la cancelacion del intento anterior y
  -- el numero de pedido). v_err conserva el error porque las variables no se
  -- revierten.
  begin
    -- 4a. Intento anterior: se cancela con cancel_order (libera sus reservas).
    -- Si ya no esta abierto (vencio, se pago, se cancelo) no hay nada que hacer.
    if v_replaces is not null then
      v_old_chat := 'web:' || v_replaces::text;
      if exists (select 1 from public.orders o
                  where o.chat_id = v_old_chat and o.status = 'abierto') then
        v_res := public.cancel_order(v_old_chat, null);
        if not coalesce((v_res ->> 'ok')::boolean, false)
           and v_res ->> 'error' is distinct from 'SIN_PEDIDO_ABIERTO' then
          v_err := jsonb_build_object('ok', false, 'error', v_res ->> 'error', 'paso', 'intento');
          raise exception 'create_web_order: pedido deshecho' using errcode = 'PS001';
        end if;
      end if;
    end if;

    -- 4b. Regla de bloqueo de 038: la union de stock_items de TODAS las lineas
    -- (recetas base y adicionales), en orden de id, antes del primer
    -- reserve_variant. Dos pedidos con lineas en orden inverso no se bloquean.
    perform 1
      from public.stock_items si
     where si.id in (
             select vc.stock_item_id
               from jsonb_array_elements(v_resolved) l
               join public.product_variants v on v.sku = l.value ->> 'variant_sku'
               join public.variant_components vc on vc.variant_id = v.id
             union
             select oc.stock_item_id
               from jsonb_array_elements(v_resolved) l
               cross join lateral jsonb_array_elements(l.value -> 'options') o
               join public.option_components oc on oc.option_id = (o.value ->> 'option_id')::uuid)
     order by si.id
       for update;

    -- 4c. Reservas: 60 minutos (diseno, «Slice 3 detail»). El precio unitario
    -- lo congela reserve_variant desde la base.
    for v_line in select value from jsonb_array_elements(v_resolved) loop
      v_res := public.reserve_variant(
        v_line ->> 'variant_sku',
        (v_line ->> 'qty')::integer,
        v_line -> 'options',
        v_chat,
        interval '60 minutes',
        null,
        1);

      if not coalesce((v_res ->> 'ok')::boolean, false) then
        v_err := jsonb_build_object(
                   'ok', false,
                   'error', case v_res ->> 'error'
                              when 'SKU_ES_PRODUCTO' then 'VARIANTE_NO_DISPONIBLE'
                              else v_res ->> 'error' end,
                   'paso', 'productos',
                   'variant_sku', v_line ->> 'variant_sku')
                 || case when v_res ? 'unidades'
                         then jsonb_build_object('unidades', v_res -> 'unidades')
                         else '{}'::jsonb end;
        raise exception 'create_web_order: pedido deshecho' using errcode = 'PS001';
      end if;

      v_order   := (v_res ->> 'order_id')::uuid;
      v_res_ids := v_res_ids || (v_res ->> 'reservation_id')::uuid;
    end loop;

    -- 4d. Ocasion, fecha y estado de pago. Pendiente de pago: el pedido sigue
    -- 'abierto'; NO es comprobante_recibido (eso es una transferencia en
    -- revision humana y extiende la reserva).
    update public.orders o
       set occasion              = v_occasion,
           desired_delivery_date = v_date,
           payment_status        = 'pendiente',
           payment_source        = 'mercadopago',
           updated_at            = now()
     where o.id = v_order;

    -- 4e. Entrega: la tarifa la calcula quote_delivery dentro de set_delivery.
    v_res := public.set_delivery(v_chat, v_method, v_address, v_distance);
    if not coalesce((v_res ->> 'ok')::boolean, false) then
      v_err := jsonb_build_object('ok', false, 'error', v_res ->> 'error', 'paso', 'entrega');
      raise exception 'create_web_order: pedido deshecho' using errcode = 'PS001';
    end if;

    -- 4f. Datos de la venta, ya enviados. token_expires_at = now(): el enlace
    -- del formulario de WhatsApp no aplica a la web y nace vencido.
    insert into public.sale_details (
      order_id, token_expires_at, submitted_at,
      buyer_name, buyer_phone, buyer_email,
      delivery_address_exact, delivery_unit, neighborhood, city, building_name,
      recipient_name, recipient_phone, may_call_recipient,
      card_from, card_to, card_message, special_notes,
      wants_invoice, invoice_legal_name, invoice_tax_id, invoice_email,
      referral_source)
    values (
      v_order, now(), now(),
      v_val ->> 'buyer_name', v_val ->> 'buyer_phone', v_val ->> 'buyer_email',
      null, v_val ->> 'delivery_unit', v_val ->> 'neighborhood', v_val ->> 'city', v_val ->> 'building_name',
      v_val ->> 'recipient_name', v_val ->> 'recipient_phone', (v_val ->> 'may_call_recipient')::boolean,
      v_val ->> 'card_from', v_val ->> 'card_to', v_val ->> 'card_message', v_val ->> 'special_notes',
      v_invoice, v_val ->> 'invoice_legal_name', v_val ->> 'invoice_tax_id', v_val ->> 'invoice_email',
      v_val ->> 'referral_source');
  exception
    when sqlstate 'PS001' then
      return v_err;
    when check_violation then
      -- Defensa: un valor fuera de una lista cerrada que paso la validacion.
      get stacked diagnostics v_check = constraint_name;
      if v_check = 'orders_occasion_check' then
        return jsonb_build_object('ok', false, 'error', 'OCASION_INVALIDA', 'paso', 'datos',
                                  'recibido', v_occasion, 'validas', to_jsonb(v_validas));
      end if;
      return jsonb_build_object('ok', false, 'error', 'DATOS_INVALIDOS', 'paso', 'datos',
                                'campos', '[]'::jsonb, 'restriccion', v_check);
    when unique_violation then
      -- Defensa detras del bloqueo consultivo: si dos envios del mismo intento
      -- llegaran a crear el pedido a la vez, el segundo choca con
      -- orders_un_abierto_por_chat. Gana el primero y el segundo lo devuelve
      -- como reutilizado.
      get stacked diagnostics v_check = constraint_name;
      if v_check is distinct from 'orders_un_abierto_por_chat' then
        raise;
      end if;
      v_race := true;
  end;

  if v_race then
    return coalesce(public._web_order_result(v_chat, true),
                    jsonb_build_object('ok', false, 'error', 'INTENTO_CERRADO',
                                       'paso', 'intento', 'estado', null));
  end if;

  return public._web_order_result(v_chat, false, v_res_ids);
end;
$function$;

comment on function public.create_web_order(jsonb) is
  'Pedido de la tienda web pendiente de pago: reservas (60 min), ocasion, fecha, entrega, payment_status pendiente / mercadopago y sale_details enviado, en una sola transaccion. Idempotente por attempt_id (chat web:<attempt_id>). Nunca confirma el pago. Solo service_role.';

-- ---------------------------------------------------------------------------
-- 5. Permisos: solo service_role, como el resto del contrato.
-- ---------------------------------------------------------------------------
revoke all on function public.normalize_sale_details(jsonb) from public, anon, authenticated;
revoke all on function public._web_order_result(text, boolean, uuid[]) from public, anon, authenticated;
revoke all on function public.create_web_order(jsonb) from public, anon, authenticated;
grant execute on function public.normalize_sale_details(jsonb) to service_role;
grant execute on function public._web_order_result(text, boolean, uuid[]) to service_role;
grant execute on function public.create_web_order(jsonb) to service_role;
