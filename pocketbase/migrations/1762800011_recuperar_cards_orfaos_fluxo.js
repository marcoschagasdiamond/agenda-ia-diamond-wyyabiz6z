// Migração 1762800011 — Recuperação dos cards órfãos do fluxo VENDA DE FAZENDAS
// (id fa6xifycsobr3qg): cards cujo status não casa com nenhuma coluna atual do
// fluxo desaparecem do quadro. Reaponta cada card para uma coluna válida,
// via update de records (API do PocketBase), nunca SQL ad-hoc. Idempotente:
// só grava quando o valor atual difere do destino.
//
// Colunas válidas do fluxo (chaves confirmadas em colunas_fluxo):
//   - verificar_ja_foi_p_compra_xq2ni  → "VERIFICAR JA FOI P COMPRA" (ordem 1)
//   - backlog_fa6xifycsobr3qg_1792104192671_1 → fase backlog (ordem 2)
migrate(
  (app) => {
    const correcoes = [
      // FAZENDA SAO ROMAO — status legado fazendo_rc9o7ev7eb9h6kx_1791937161608_3
      { id: 'lku2v2nznnjjn2t', status: 'backlog_fa6xifycsobr3qg_1792104192671_1' },
      // "Novo card" ×2 — garantia extra: status na coluna VERIFICAR + família preservada
      {
        id: 'lvv4xff7kk1h6tg',
        status: 'verificar_ja_foi_p_compra_xq2ni',
        grupo_familia: '40wmpn0patjlkf5',
      },
      {
        id: 'onmojnb6cl7yads',
        status: 'verificar_ja_foi_p_compra_xq2ni',
        grupo_familia: '40wmpn0patjlkf5',
      },
    ]

    for (const fix of correcoes) {
      try {
        const rec = app.findRecordById('cards', fix.id)
        let mudou = false
        if (rec.getString('status') !== fix.status) {
          rec.set('status', fix.status)
          mudou = true
        }
        if (fix.grupo_familia && rec.getString('grupo_familia') !== fix.grupo_familia) {
          rec.set('grupo_familia', fix.grupo_familia)
          mudou = true
        }
        if (mudou) app.save(rec)
      } catch (_) {}
    }
  },
  () => {},
)
