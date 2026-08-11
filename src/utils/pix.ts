/**
 * Gera a string do PIX estático (BRCode) com valor opcional
 */
export function gerarPayloadPix(chave: string, valor: number, estabelecimento: string) {
    const chaveNormalizada = chave.trim();
    const nomeEstabelecimento = estabelecimento.substring(0, 25).toUpperCase();
    const cidade = 'BRASIL';
    const valorFormatado = valor.toFixed(2);

    const payload = [
    '000201', 
    `26${(chaveNormalizada.length + 22).toString().padStart(2, '0')}0014br.gov.bcb.pix01${chaveNormalizada.length.toString().padStart(2, '0')}${chaveNormalizada}`,
    '52040000', 
    '5303986',  
    `54${valorFormatado.length.toString().padStart(2, '0')}${valorFormatado}`, 
    '5802BR',   
    `59${nomeEstabelecimento.length.toString().padStart(2, '0')}${nomeEstabelecimento}`,
    `60${cidade.length.toString().padStart(2, '0')}${cidade}`,
    '62070503***', 
    '6304' 
  ].join('');

  return payload + calculateCRC16(payload);
}

/**
 * Cálculo simplificado de CRC16 para PIX
 */
function calculateCRC16(str: string): string {
    let crc = 0xFFFF;
    for (let i =0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc <<= 1;
            }
        }
    }
    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}
