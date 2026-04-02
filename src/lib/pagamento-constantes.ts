import type { MetodoPagamento, BandeiraCartao } from '@/types/domain'

export const METODOS_PAGAMENTO: MetodoPagamento[] = [
    'DINHEIRO', 'PIX', 'CARTAO_DEBITO', 'CARTAO_CREDITO', 'CORTESIA', 'VOUCHER', 'PERMUTA',
]

export const BANDEIRAS_CARTAO: { valor: BandeiraCartao; label: string }[] = [
    { valor: '',           label: 'Padrão (todas)'    },
    { valor: 'VISA',       label: 'Visa'              },
    { valor: 'MASTERCARD', label: 'Mastercard'        },
    { valor: 'ELO',        label: 'Elo'               },
    { valor: 'AMEX',       label: 'American Express'  },
    { valor: 'HIPERCARD',  label: 'Hipercard'         },
]

export const METODOS_COM_BANDEIRA: MetodoPagamento[] = ['CARTAO_DEBITO', 'CARTAO_CREDITO']
