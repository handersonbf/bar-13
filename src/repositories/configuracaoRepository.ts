import { getDatabase } from '../database/connection';
import { Configuracao } from '../types/domain';

type ConfigRow = {
  id: number;
  device_id: string;
  nome_aparelho: string;
  operador_atual_sync_id: string;
  operador_atual_nome: string;
  chave_pix: string;
  caminho_imagem_qr_code: string;
  nome_bar: string;
  texto_padrao_cobranca: string;
  central_web_app_url: string;
  central_token: string;
  last_exported_at: string;
  last_imported_at: string;
};

function mapRow(row: ConfigRow): Configuracao {
  return {
    id: row.id,
    deviceId: row.device_id,
    nomeAparelho: row.nome_aparelho,
    operadorAtualSyncId: row.operador_atual_sync_id,
    operadorAtualNome: row.operador_atual_nome,
    chavePix: row.chave_pix,
    caminhoImagemQrCode: row.caminho_imagem_qr_code,
    nomeBar: row.nome_bar,
    textoPadraoCobranca: row.texto_padrao_cobranca,
    centralWebAppUrl: row.central_web_app_url,
    centralToken: row.central_token,
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
         operador_atual_sync_id = ?,
         operador_atual_nome = ?,
         chave_pix = ?,
         caminho_imagem_qr_code = ?,
         nome_bar = ?,
         texto_padrao_cobranca = ?,
         central_web_app_url = ?,
         central_token = ?,
         last_exported_at = ?,
         last_imported_at = ?
     WHERE id = 1;`,
    [
      input.nomeAparelho?.trim() || current.nomeAparelho,
      input.operadorAtualSyncId ?? current.operadorAtualSyncId,
      input.operadorAtualNome ?? current.operadorAtualNome,
      input.chavePix ?? current.chavePix,
      input.caminhoImagemQrCode ?? current.caminhoImagemQrCode,
      input.nomeBar ?? current.nomeBar,
      input.textoPadraoCobranca ?? current.textoPadraoCobranca,
      input.centralWebAppUrl ?? current.centralWebAppUrl,
      input.centralToken ?? current.centralToken,
      input.lastExportedAt ?? current.lastExportedAt,
      input.lastImportedAt ?? current.lastImportedAt,
    ]
  );

  return getConfiguracao();
}
