import { getDatabase } from '../database/connection';
import { Configuracao } from '../types/domain';

type ConfigRow = {
  id: number;
  device_id: string;
  nome_aparelho: string;
  chave_pix: string;
  caminho_imagem_qr_code: string;
  nome_bar: string;
  texto_padrao_cobranca: string;
  last_exported_at: string;
  last_imported_at: string;
};

function mapRow(row: ConfigRow): Configuracao {
  return {
    id: row.id,
    deviceId: row.device_id,
    nomeAparelho: row.nome_aparelho,
    chavePix: row.chave_pix,
    caminhoImagemQrCode: row.caminho_imagem_qr_code,
    nomeBar: row.nome_bar,
    textoPadraoCobranca: row.texto_padrao_cobranca,
    lastExportedAt: row.last_exported_at,
    lastImportedAt: row.last_imported_at,
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
     SET nome_aparelho = ?,
         chave_pix = ?,
         caminho_imagem_qr_code = ?,
         nome_bar = ?,
         texto_padrao_cobranca = ?,
         last_exported_at = ?,
         last_imported_at = ?
     WHERE id = 1;`,
    [
      input.nomeAparelho?.trim() || current.nomeAparelho,
      input.chavePix ?? current.chavePix,
      input.caminhoImagemQrCode ?? current.caminhoImagemQrCode,
      input.nomeBar ?? current.nomeBar,
      input.textoPadraoCobranca ?? current.textoPadraoCobranca,
      input.lastExportedAt ?? current.lastExportedAt,
      input.lastImportedAt ?? current.lastImportedAt,
    ]
  );

  return getConfiguracao();
}
