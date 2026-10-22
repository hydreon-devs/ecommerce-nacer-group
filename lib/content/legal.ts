/** Un bloque es un párrafo o una lista; sin marcado, para que el texto sea dato. */
export type LegalBlock = string | { list: string[] };

export interface LegalSection {
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  title: string;
  sections: LegalSection[];
}

/**
 * Textos legales del sitio anterior (Odoo), copiados VERBATIM a propósito: son
 * decisiones jurídicas del cliente. Solo se normalizó espacio en blanco y el
 * "1.Autorización" -> "1. Autorización". NO corregir aquí la numeración
 * repetida de los términos, ni las referencias desactualizadas (dominio
 * `.com.co`, PBX, registro/contraseña): se actualizan cuando el cliente
 * revise el texto, no antes.
 */
export const PRIVACY_POLICY: LegalDocument = {
  title: "Política de Privacidad y Datos",
  sections: [
    {
      heading: "1. Autorización.",
      blocks: [
        "El titular, por medio del presente autoriza de manera previa, expresa e informada a NACER GROUP SAS con NIT 901417382-8, sociedad que actuará como responsable, para que realice la recolección, almacenamiento, uso, procesamiento, circulación, supresión, transferencia, transmisión y, en general, cualquier operación o conjunto de operaciones en y sobre los datos personales del titular, entendidos como cualquier información vinculada o que pueda asociarse a el titular (en adelante los “Datos Personales”). Los Datos Personales incluyen, pero no se limitan a, datos de identificación, información de contacto y de localización, datos catalogados como sensibles, información financiera, preferencias y comportamientos de consumo, datos inferidos a partir de información observada o entregada directamente por el titular o por terceros e información demográfica y transaccional.",
        "Los Datos Personales serán recolectados a través de los diferentes canales que disponga NACER GROUP SAS y mediante los cuales el titular suministre su información.",
        "Usted podrá revocar su autorización en cualquier momento, solicitándolo a través de nuestro correo electrónico crisalidasymariposas@gmail.com y el número celular 3022660615 o cualquiera de nuestros canales de comunicación habilitados",
      ],
    },
    {
      heading: "2. Nuestro compromiso.",
      blocks: [
        "Los datos personales en custodia de NACER GROUP SAS en su condición de Responsable y/o Encargado del tratamiento según el caso, serán tratados y protegidos cumpliendo los principios y regulaciones previstas en las leyes colombianas y demás que le sean aplicables en la materia, así como de conformidad con buenas prácticas en protección de datos personales.",
      ],
    },
    {
      heading: "¿Cuáles son los derechos que tienes sobre tus datos personales (derechos de habeas data)?",
      blocks: [
        {
          list: [
            "Acceder, conocer, consultar, rectificar, corregir y actualizar tus datos personales.",
            "Revocar de forma parcial o total la Autorización que nos has otorgado y/o solicitar la supresión parcial o total de tus datos personales, salvo cuando por deberes legales o contractuales tus datos deban permanecer en nuestras bases de datos.",
            "Solicitar prueba de la Autorización que nos has otorgado para tratar tus datos personales.",
            "Ejercer las demás acciones que la ley te reconoce en materia de protección de datos personales y habeas data.",
          ],
        },
      ],
    },
    {
      heading: "3. Ámbito de aplicación.",
      blocks: [
        "La presente política aplica al tratamiento de los datos personales de los titulares que conforman los diversos grupos de interés de NACER GROUP SAS trátese de clientes, proveedores, empleados, accionistas, entre otros. En este sentido, la misma es aplicable al tratamiento de datos personales de la persona natural que nos proporcione sus datos personales, directamente o a través de terceros, bien sea en calidad de responsable o de Encargado de tratamiento, cumpliendo con los respectivos requisitos legales vigentes en la materia.",
      ],
    },
    {
      heading: "4. Derechos de conformidad a la Ley 1581 de 2012.",
      blocks: [
        "Usted podrá ejercer los derechos que se indican en el numeral precedente y todos los demás derechos que confiere la Ley 1581 de 2012, comunicándose con NACER GROUP SAS a través del correo electrónico crisalidasymariposas@gmail.com y el número celular 3022660615 o cualquiera de nuestros canales de comunicación habilitados, nuestra área de Servicio al Cliente de será la responsable de la atención de peticiones, consultas y reclamos ante la cual el Titular puede ejercer sus derechos a conocer, actualizar, rectificar y suprimir los Datos Personales y revocar la autorización de Tratamiento de Datos Personales.",
      ],
    },
    {
      heading: "5. Política de privacidad.",
      blocks: [
        "Esta política de Privacidad establece los términos en que NACER GROUP SAS usa y protege la información que es proporcionada por sus usuarios al momento de utilizar su sitio web. Esta compañía está comprometida con la seguridad de los datos de sus usuarios. Cuando le pedimos llenar los campos de información personal con la cual usted pueda ser identificado, lo hacemos asegurando que sólo se empleará de acuerdo con los términos de este documento. Sin embargo esta Política de Privacidad puede cambiar con el tiempo o ser actualizada por lo que le recomendamos y enfatizamos revisar continuamente esta página para asegurarse que está de acuerdo con dichos cambios.",
      ],
    },
    {
      heading: "6. Información que es recogida.",
      blocks: [
        "Nuestro sitio web podrá recoger información personal por ejemplo: Nombre, información de contacto como su dirección de correo electrónico e información demográfica. Así mismo cuando sea necesario podrá ser requerida información específica para procesar algún pedido o realizar una entrega o facturación.",
      ],
    },
    {
      heading: "7. Uso de la información recogida.",
      blocks: [
        "Nuestro sitio web emplea la información con el fin de procesar sus pedidos y realizar el envio de las compras lo mas efectivamente posible, particularmente para mantener un registro de usuarios, de pedidos en caso que aplique, y mejorar nuestros productos y servicios. Es posible que sean enviados correos electrónicos periódicamente a través de nuestro sitio con ofertas especiales, nuevos productos y otra información publicitaria que consideremos relevante para usted o que pueda brindarle algún beneficio, estos correos electrónicos serán enviados a la dirección que usted proporcione y podrán ser cancelados en cualquier momento.",
        "NACER GROUP SAS está altamente comprometido para cumplir con el compromiso de mantener su información custodiada de manera segura y eficiente, que nos permita proteger la información de nuestros clientes.",
      ],
    },
    {
      heading: "8. Consulta.",
      blocks: [
        "En caso que usted desee consultar sus Datos Personales que reposen en nuestras bases de datos, deberá comunicarse con NACER GROUP SAS a través de los Canales de Atención crisalidasymariposas@gmail.com y el número celular 3022660615 o cualquiera de nuestros canales de comunicación habilitados y generar la solicitud de consulta de Datos Personales. Para lo anterior, es necesario que al momento de generar la solicitud, indique su número de identificación y sus datos de contacto. NACER GROUP SAS dará respuesta a la consulta, vía correo electrónico o cualquier medio que considere idóneo, en un término máximo de diez (10) días hábiles contados a partir de la fecha de recibo",
      ],
    },
    {
      heading: "9. Reclamo por corrección, actualización y/o supresión de datos personales.",
      blocks: [
        "En caso que usted desee presentar un reclamo por corrección, actualización y/o supresión de Datos Personales deberá comunicarse con NACER GROUP SAS a través de los Canales de Atención crisalidasymariposas@gmail.com y el número celular 3022660615 o cualquiera de nuestros canales de comunicación habilitados, Para lo anterior, es necesario que al momento de generar la solicitud, indique su número de identificación, sus datos de contacto y NACER GROUP SAS procederá a eliminar la información de la base de datos en un tiempo máximo de 5 días hábiles.",
        "Si usted manifiesta, por cualquiera de los Canales de Atención, que no desea recibir publicidad, NACER GROUP SAS procederá a hacer efectiva su solicitud en un término de cinco (5) días hábiles contados desde la recepción de la misma. De esta manera, usted recibirá un correo electrónico confirmando la eliminación de sus Datos Personales de las bases de datos de publicidad de NACER GROUP SAS",
        "Como titular de los Datos Personales y/o representante legal del menor, el titular acepta y reconoce que ha sido informado sobre sus derechos a presentar solicitudes de información, actualización, supresión, rectificación y a revocar la autorización de los Datos Personales, a autorizar o no el tratamiento de datos sensibles (Ejemplo: huella dactilar, fotos, videograbaciones y otros datos biométricos) y a contestar voluntariamente las preguntas que versen sobre datos personales sensibles o de menores de edad, sujeto a lo establecido en la legislación aplicable y conforme a lo previsto en la Política. Cualquier consulta, solicitud, reclamo, queja y petición relacionada con sus datos personales, podrá dirigirla a crisalidasymariposas@gmail.com y el número celular 3022660615.",
        "El titular declara que el suministro de datos de terceros, en los casos en donde aplique, lo ha realizado con su inequívoca y expresa autorización. Finalmente, el titular y/o representante legal manifiesta que los Datos Personales sobre los cuales otorga la presente autorización los ha suministrado de forma voluntaria, verídica y completa.",
      ],
    },
    {
      heading: "10. Cookies.",
      blocks: [
        "Una cookie se refiere a un fichero que es enviado con la finalidad de solicitar permiso para almacenarse en su ordenador, al aceptar dicho fichero se crea y la cookie sirve entonces para tener información respecto al tráfico web, y también facilita las futuras visitas a una web recurrente. Otra función que tienen las cookies es que con ellas las web pueden reconocerte individualmente y por tanto brindarte el mejor servicio personalizado de su web.",
        "Nuestro sitio web emplea las cookies para poder identificar las páginas que son visitadas y su frecuencia. Esta información es empleada únicamente para análisis estadístico y después la información se elimina de forma permanente. Usted puede eliminar las cookies en cualquier momento desde su ordenador. Sin embargo las cookies ayudan a proporcionar un mejor servicio de los sitios web, estás no dan acceso a información de su ordenador ni de usted, a menos de que usted así lo quiera y la proporcione directamente. Usted puede aceptar o negar el uso de cookies, sin embargo la mayoría de navegadores aceptan cookies automáticamente pues sirve para tener un mejor servicio web. También usted puede cambiar la configuración de su ordenador para declinar las cookies. Si se declinan es posible que no pueda utilizar algunos de nuestros servicios.",
      ],
    },
    {
      heading: "11. Control de su información personal.",
      blocks: [
        "En cualquier momento usted puede restringir la recopilación o el uso de la información personal que es proporcionada a nuestro sitio web. Cada vez que se le solicite rellenar un formulario, como el de alta de usuario, puede marcar o desmarcar la opción de recibir información por correo electrónico. En caso de que haya marcado la opción de recibir nuestro boletín o publicidad usted puede cancelarla en cualquier momento.",
        "Esta compañía no venderá, cederá ni distribuirá la información personal que es recopilada sin su consentimiento, salvo que sea requerido por un juez con un orden judicial.",
      ],
    },
    {
      heading: "12. Vigencia.",
      blocks: [
        "Esta Política se encuentra vigente y podrá ser modificada por NACER GROUP SAS en cualquier momento. Sin perjuicio de lo anterior, NACER GROUP SAS le informará, por los medios que se estime convenientes, de cualquier cambio sustancial con anterioridad a que dicha modificación entre en vigencia.",
      ],
    },
  ],
};

export const TERMS_AND_CONDITIONS: LegalDocument = {
  title: "Términos y condiciones",
  sections: [
    {
      heading: "1. Términos y Condiciones de Uso",
      blocks: [
        "Al ingresar, revisar y comprar en este sitio web usted se compromete a leer, informarse y cumplir los términos y condiciones de uso, además se obliga a respetar las políticas de privacidad. De conformidad con la legislación Colombiana sobre el tema, pues el contenido, productos y ofertas que usted encuentra en www.crisalidasymariposas.com.co aplican únicamente para Colombia",
        "NACER GROUP SAS podrá realizar modificaciones en cualquier momento de los términos y condiciones aquí descritas. En todo caso, sí éstos términos y condiciones varían lo informaremos por todos los canales de difusión para que usted los conozca y acepte nuevamente.",
      ],
    },
    {
      heading: "2. Información de los usuarios",
      blocks: [
        "En nuestro sitio web, una vez se realiza la orden, puede escoger su forma de pago y recogida o envio del producto, tenemos pago por transferencia bancaria o mediante tarjeta de crédito y Pse con la aplicación MercadoPago, para tal efecto se requiere de información personal y confidencial. Esta información será de uso exclusivo de NACER GROUP SAS y no será revelada a terceros, salvo la información que requiera MERCADOPAGO para efectos de procesar las transacciones electrónicas de pago.",
        "Buscando la seguridad en las transacciones, queda expresamente prohibido a los usuarios el compartir con terceros su contraseña o el password; pues dicha información es de uso exclusivo del usuario y no se podrá utilizar para fines no autorizados.",
        "Los datos referidos en estos términos y condiciones tendrán como finalidad validar las órdenes de compra, mejorar la labor de información y comercialización de los productos y servicios prestados por las empresas. Sólo podrán ser entregados a las empresas filiales o relacionadas con NACER GROUP SAS en ningún caso serán traspasados a terceros. Dicha entrega será revocable por el usuario mediante solicitud en nuestro correo crisalidasymariposas@gmail.com o en el PBX 6071235",
      ],
    },
    {
      heading: "3. Registro y contraseña",
      blocks: [
        "El registro de cada usuario se verificará completando y suscribiendo el formulario que se encuentra en el sitio y su posterior envío, el cual se realiza automáticamente pulsando “click” en el elemento respectivo.",
        "Una vez registrado el usuario dispondrá de un nombre y contraseña o clave definitiva que le permitirá el acceso personalizado, confidencial y seguro a www.crisalidasymariposas.com.co y podrá cambiar la clave de acceso, para lo cual deberá sujetarse al procedimiento establecido en el sitio respectivo.",
        "El usuario es totalmente responsable por el mantenimiento de la confidencialidad de su clave secreta registrada en este sitio web, por medio de la cual podrá efectuar compras, solicitar servicios y obtener información. Dicha clave es de uso personal y su entrega a terceros no involucra responsabilidad de NACER GROUP SAS, ni de las empresas relacionadas en caso de indebida utilización.",
      ],
    },
    {
      heading: "4. Derechos del usuario",
      blocks: [
        "En NACER GROUP S.A.S. somos respetuosos de los derechos de los consumidores y en nuestras políticas internas tenemos como directriz la aplicación de las leyes referentes a la materia. El usuario gozará de todos los derechos que le reconoce la legislación Colombiana sobre Protección al Consumidor y Protección de Datos personales, por tal razón, podrá radicar sus peticiones, quejas, reclamos y sugerencias (PQRS) a través de las diferentes herramientas y mecanismos de comunicación establecidos por la página.",
        "Igualmente, el usuario también podrá presentarlas de manera presencial en nuestra oficina.",
      ],
    },
    {
      heading: "5. Tiempos de envio",
      blocks: [
        "Una vez recibamos y sea verificado el pedido realizado en nuestra pagina web, NACER GROUP SAS alista el paquete y procede al despacho a mas tardar al día hábil siguiente a través del mensajero de la empresa, un tercero ó empresas de envío y será proporcionado el numero de guía via correo electrónico ó chat de whatsapp, la empresa de envios ofrece un tiempo de entrega de 2 a 3 días hábiles, se debe tener en cuenta que el envio puede sufrir retrasos por complicaciones logísticas de entrega, o zonas de difícil acceso por lo que NACER GROUP SAS no se hace responsable de dicho retraso.",
      ],
    },
    {
      heading: "6. Garantias",
      blocks: [
        "-El tiempo de garantía de todos los productos vendidos por NACER GROUP SAS es de 30 días, cumpliendo así con lo dispuesto por la ley 1480 de 2011.",
        "-Esta garantía APLICARÁ ÚNICAMENTE para las Crisálidas de Mariposas.",
        "-Si la Crisálida presenta daño, enfermedad, infección o no emerja dentro de los 30 días siguientes a la compra, se evaluará y se determinará si procede el cambio por una crisálida nueva o no, esto a discreción de NACER GROUP SAS.",
        "- Cada caso en particular será debidamente revisado y aprovado por la Bióloga de NACER GROUP S.A.S. quien será la encargada de definir si hay o no reposición de la crisálida.",
        "-Se le informa al reclamante que el tiempo de entrega de la resposicón por garantía será al siguiente día o el mismo día según entregue la crisálida defectuosa, dando cumplimiento a lo establecido en la ley 1480 de 2011.",
        "Para los clientes que residan en el área metropolitana del Valle De Aburrá ( Caldas, La Estrella, Sabaneta, Itagüí, Envigado, Bello, Copacabana, Girardota, Barbosa, San Antonio de Prado y San Cristobal.) deberán acercarse a nuestra oficina para dejar la crisálida defectuosa y recoger una nueva por la cual se hace reposición.",
        "Para las demás ciudades y municipios, el cliente debe asumir el valor del envío a nuestra oficina y recogida.",
      ],
    },
    {
      heading: "7. Medios de pago",
      blocks: [
        "-Consignacion o transferencia Bancolombia",
        "-Tarjetas de crédito ( Aplican cargos adicionales por el tercero ) mediante MERCADOPAGO quien es el encargado de procesar la transacción, las franquicias aceptadas son VISA – AMERICAN EXPRESS – MASTERCARD – DINERS CLUB",
        "-Pago en efectivo en tienda únicamente en Medellín",
        "-Pagos por PSE a través de MERCADO PAGO",
      ],
    },
    {
      heading: "6. Métodos de entrega",
      blocks: [
        "En Medellín el producto puede ser retirado en tienda o enviado con nuestro mensajero propio a la dirección proporcionada en la orden de compra, para otras ciudades se realiza a través de trasportadoras utilizadas que son MANDAR Y SERVIR – SERVIENTREGA",
      ],
    },
    {
      heading: "7. Nuestros productos",
      blocks: [
        "Todos los productos comprados en NACER GROUP SAS son diseños originales, nuevos, crisálidas garantizadas y con 30 días de garantía, somos reconocidos por nuestra calidad, elegancia, diseños exclusivos, lo que hace que nuestros productos sean confiables.",
      ],
    },
    {
      heading: "8. Tus datos se mantendrán bajo estricta confidencialidad",
      blocks: [
        "www.crisalidasymariposas.com.co usa un sistema de seguridad llamado SSL (Secure Socket Layer), que actualmente es el estándar usado por las compañías más importantes del mundo para realizar transacciones electrónicas seguras, lo que significa que toda tu información personal no podrá ser leída, ni capturada por terceros mientras viaja por la red.",
      ],
    },
    {
      heading: "9. Compromiso con la seguridad",
      blocks: [
        "En relación a nuestro Sitio www.crisalidasymariposas.com,co NACER GROUP SAS, hace esta declaración de seguridad y privacidad en orden a demostrar y comunicar su compromiso con una práctica de negocios de alto nivel ético y dotada de los controles internos apropiados. Además hace esta declaración para garantizar el compromiso con la protección de los datos personales de los usuarios del Sitio:",
        "Nuestro Sitio está protegido con una amplia variedad de medidas de seguridad, tales como procedimientos de control de cambios, claves y controles de acceso físico. También empleamos otros mecanismos para asegurar que la información y los Datos Personales que usted proporciona no sean extraviados, mal utilizados o modificados inapropiadamente. Esos controles incluyen políticas de confidencialidad y respaldo periódico de bases de datos.",
      ],
    },
    {
      heading: "10. Plazo de validez de la oferta y precio",
      blocks: [
        "El plazo de validez de la oferta es aquel que coincide con la fecha de vigencia indicada en la promoción o en virtud del agotamiento de las cantidades de productos disponibles para esa promoción debidamente informados al Usuario, o mientras la oferta se mantenga disponible, el menor de éstos plazos. Cuando quiera que en una promoción no se indique una fecha de terminación se entenderá que la actividad se extenderá hasta el agotamiento de los inventarios correspondientes.",
        "Los precios de los productos y servicios disponibles en el Sitio, mientras aparezcan en él, solo tendrán vigencia y aplicación en éste y no serán aplicables a otros canales de venta utilizados por las empresas, tales como tiendas físicas, venta telefónica, otros sitios de venta por vía electrónica, catálogos u otros. Los precios de los productos ofrecidos en el Sitio están expresados en Pesos colombianos salvo que se manifieste lo contrario. Los precios ofrecidos corresponden exclusivamente al valor del bien ofrecido y no incluyen gastos de transporte, manejo, envío, accesorios que no se describan expresamente ni ningún otro ítem adicional.",
        "Adicionalmente, es posible que cierto número de productos puedan tener un precio incorrecto. De existir un error tipográfico en alguno de los precios de los productos, si el precio correcto del artículo es más alto que el que figura en la página, a nuestra discreción, NACER GROUP SAS lo contactará antes de que el producto sea enviado, y/o cancelaremos el pedido y le notificaremos acerca de la cancelación.",
        "Las empresas podrán modificar cualquier información contenida en este Sitio, incluyendo las relacionadas con mercaderías, servicios, precios, existencias y condiciones, en cualquier momento y sin previo aviso, hasta el momento de recibir una aceptación de compra, la cual obligará a la Empresa Oferente, sujeto a las condiciones de validación que se indican anteriormente, es decir, una vez que se haya formado el consentimiento entre las partes de una determinada transacción.",
      ],
    },
    {
      heading: "11. Mayor información",
      blocks: [
        "La presente Política rige a partir de su publicación y se entiende vigente durante todo el término de la relación existente entre usted y NACER GROUP SAS. La presente Política se rige por las leyes de la República de Colombia.",
      ],
    },
  ],
};
