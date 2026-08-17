// Cliente best-effort para o catálogo do Xbox Game Pass (PC).
// Usa endpoints internos da Microsoft, não documentados oficialmente — o mesmo
// padrão usado por diversos projetos open-source da comunidade. Pode quebrar
// sem aviso se a Microsoft mudar esses endpoints; por isso todo erro aqui é
// tratado de forma best-effort (nunca derruba a aplicação).

const SIGLS_URL = "https://catalog.gamepass.com/sigls/v2";
const DISPLAY_CATALOG_URL = "https://displaycatalog.mp.microsoft.com/v7.0/products";

// ID da lista "PC Game Pass" usada pela comunidade (pode precisar de ajuste
// se a Microsoft trocar o identificador do catálogo).
const PC_GAME_PASS_LIST_ID = "fdd9e2a7-0960-4733-b159-2a6a0a70c327";

interface SiglsEntry {
  id: string;
}

interface DisplayCatalogProduct {
  ProductId: string;
  LocalizedProperties: { ProductTitle: string }[];
}

export interface GamePassCatalogItem {
  productId: string;
  title: string;
}

export async function fetchGamePassCatalog(): Promise<GamePassCatalogItem[]> {
  try {
    const siglsUrl = new URL(SIGLS_URL);
    siglsUrl.searchParams.set("id", PC_GAME_PASS_LIST_ID);
    siglsUrl.searchParams.set("language", "pt-br");
    siglsUrl.searchParams.set("market", "BR");

    const siglsRes = await fetch(siglsUrl);
    if (!siglsRes.ok) {
      console.warn("Game Pass: falha ao buscar lista de produtos", siglsRes.status);
      return [];
    }

    const entries = (await siglsRes.json()) as SiglsEntry[];
    const ids = entries.map((e) => e.id).filter(Boolean);
    if (ids.length === 0) return [];

    // A Display Catalog API tem limite de ids por requisição — quebra em lotes.
    const BATCH_SIZE = 20;
    const items: GamePassCatalogItem[] = [];

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      const detailsUrl = new URL(DISPLAY_CATALOG_URL);
      detailsUrl.searchParams.set("bigIds", batch.join(","));
      detailsUrl.searchParams.set("market", "BR");
      detailsUrl.searchParams.set("languages", "pt-br");

      const detailsRes = await fetch(detailsUrl);
      if (!detailsRes.ok) continue;

      const data = (await detailsRes.json()) as { Products?: DisplayCatalogProduct[] };
      for (const product of data.Products ?? []) {
        const title = product.LocalizedProperties?.[0]?.ProductTitle;
        if (title) {
          items.push({ productId: product.ProductId, title });
        }
      }
    }

    return items;
  } catch (err) {
    console.error("Game Pass: erro ao sincronizar catálogo (best-effort)", err);
    return [];
  }
}
