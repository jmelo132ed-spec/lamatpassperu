export type PaymentLeg = {
  title: string;
  dateLabel: string;
  depart: string;
  arrive: string;
  fromCode: string;
  toCode: string;
  brand: string;
};

export const paymentCopy = {
  title: 'Confirma y paga tu compra',
  totalLabel: 'Total a pagar',
  detailCta: 'Revisa el detalle de tu compra',
  methodsTitle: 'Medios de pago',
  walletTitle: 'Paga con transferencia bancaria o tu LATAM Wallet',
  walletSubtitle: 'Obtén más opciones de pago y beneficios al iniciar sesión.',
  walletLogin: 'Iniciar Sesión',
  walletUnavailable: 'Este medio de pago no está disponible temporalmente.',
  addCardTitle: 'Agregar tarjeta',
  addCardSubtitle: 'Débito con CVV o crédito Visa, Mastercard, Diners Club o Discover.',
  payWithCard: 'A pagar con tarjeta',
  cardNumberPh: 'Número de tarjeta',
  cardNamePh: 'Nombre y apellido',
  cardExpPh: 'Expiración',
  cardCvvPh: 'Código CVV',
  cardEmailPh: 'Email',
  receiptTitle: '¿A dónde enviamos el comprobante de compra?',
  receiptHint:
    'La persona que reciba el comprobante será administradora del viaje y la única que podrá solicitar cambios y devoluciones.',
  invoiceTitle: '¿Necesitas factura?',
  invoiceToggle: 'Solicitar Factura',
  invoiceTips: [
    'Factura válida para personas y empresas inscritas en Perú.',
    'Para justificar costos o gastos, ingresar el RUC, de lo contrario el documento tendrá validez de boleta de venta.',
    'Aplica un solo RUC para toda la compra.',
  ],
  invoiceBusinessName: 'Razón social',
  invoiceRuc: 'RUC',
  invoiceCountry: 'País',
  invoiceCity: 'Ciudad',
  invoiceEmail: 'Email',
  invoiceEmailHint: 'Este correo recibirá la factura',
  invoiceConfirm:
    'Confirmo que los datos son correctos y que coinciden con los de SUNAT.',
  invoiceDefaultCountry: 'Perú',
  termsPrefix: 'Al continuar acepto los',
  termsLink: 'términos y condiciones de la compra',
  termsHref: 'https://www.latamairlines.com/pe/es/legal/condiciones-generales-transporte',
  payPrefix: 'Pagar',
  processingTitle: 'Estamos procesando tu pago',
  processingHint: 'No recargues ni cierres la página',
};

export const defaultPaymentLegs: PaymentLeg[] = [
  {
    title: 'De Lima a Cusco',
    dateLabel: 'dom, 23 ago',
    depart: '07:40',
    arrive: '08:55',
    fromCode: 'LIM',
    toCode: 'CUZ',
    brand: 'Full',
  },
  {
    title: 'De Cusco a Lima',
    dateLabel: 'mar, 22 sept',
    depart: '14:58',
    arrive: '16:15',
    fromCode: 'CUZ',
    toCode: 'LIM',
    brand: 'Full',
  },
];
