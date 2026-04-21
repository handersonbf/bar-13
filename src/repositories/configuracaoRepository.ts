import { getDatabase } from '../database/connection';
import { Configuracao } from '../types/domain';

type ConfigRow = {
  id: number;
  chave_pix: string;
  caminho_imagem_qr_code: string;
  nome_bar: string;
  texto_padrao_cobranca: string;
};

function mapRow(row: ConfigRow): Configuracao {
  return {
    id: row.id,
    chavePix: row.chave_pix,
    caminhoImagemQrCode: row.caminho_imagem_qr_code,
    nomeBar: row.nome_bar,
    textoPadraoCobranca: row.texto_padrao_cobranca,
  };
}

export async function getConfiguracao() {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ConfigRow>('SELECT * FROM configuracoes WHERE id = 1;');

  if (!row) {
    throw new Error('Configuração principal não encontrada.');
  }

  return mapRow(row);
}

export async function updateConfiguracao(input: Partial<Omit<Configuracao, 'id'>>) {
  const current = await getConfiguracao();
  const db = await getDatabase();

  await db.runAsync(
    `UPDATE configuracoes
     SET chave_pix = ?,
         caminho_imagem_qr_code = ?,
         nome_bar = ?,
         texto_padrao_cobranca = ?
     WHERE id = 1;`,
    [
      input.chavePix ?? current.chavePix,
      input.caminhoImagemQrCode ?? current.caminhoImagemQrCode,
      input.nomeBar ?? current.nomeBar,
      input.textoPadraoCobranca ?? current.textoPadraoCobranca,
    ]
  );

  return getConfiguracao();
}
