import fs from "node:fs/promises";
import path from "node:path";
import Image from "next/image";

type AlbumItem = {
  id: string;
  src: string;
  type: "image" | "video";
  date: string;
  timestamp: number;
};

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".ogg", ".m4v"]);
const ALBUM_DIR = path.join(process.cwd(), "public", "album");

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function getAlbumItems(): Promise<AlbumItem[]> {
  try {
    const entries = await fs.readdir(ALBUM_DIR);

    const items = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(ALBUM_DIR, entry);
        const stats = await fs.stat(entryPath);

        if (!stats.isFile()) {
          return null;
        }

        const extension = path.extname(entry).toLowerCase();
        const isImage = IMAGE_EXTENSIONS.has(extension);
        const isVideo = VIDEO_EXTENSIONS.has(extension);

        if (!isImage && !isVideo) {
          return null;
        }

        return {
          id: `${entry}-${stats.mtimeMs}`,
          src: `/album/${encodeURIComponent(entry)}`,
          type: isImage ? "image" : "video",
          date: formatDate(stats.mtime),
          timestamp: stats.mtimeMs,
        } satisfies AlbumItem;
      })
    );

    return items
      .filter((item): item is AlbumItem => item !== null)
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export default async function Home() {
  const albumItems = await getAlbumItems();

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-black/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 md:px-6">
          <span className="text-lg font-semibold tracking-tight">nossoalbum</span>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-6 px-0 md:grid-cols-[240px_minmax(0,680px)] md:px-6 lg:grid-cols-[250px_minmax(0,680px)_260px]">
        <aside className="hidden pt-8 md:block">
          {/* <div className="sticky top-24 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="text-sm font-medium text-zinc-200">Seu álbum</p>
            <p className="mt-2 text-sm text-zinc-400">Arraste imagens e vídeos para public/album</p>
          </div> */}             
        </aside>

        <main className="pb-8 pt-3 md:pt-8">
          <div className="mx-auto flex w-full max-w-[680px] flex-col gap-6">
            {albumItems.length === 0 ? (
              <section className="mx-3 rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/60 p-8 text-center md:mx-0">
                <h1 className="text-xl font-semibold">Seu feed está vazio</h1>
                <p className="mt-3 text-sm text-zinc-400">
                  Coloque arquivos de imagem ou vídeo dentro de public/album para começar.
                </p>
              </section>
            ) : (
              albumItems.map((item) => (
                <article key={item.id} className="overflow-hidden border-y border-zinc-800 bg-black md:rounded-xl md:border">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-rose-500 via-orange-400 to-amber-300 p-[1px]">
                        <div className="h-full w-full rounded-full bg-zinc-950" />
                      </div>
                      <p className="text-sm font-medium">nossoalbum</p>
                    </div>
                    <time className="text-xs text-zinc-400">{item.date}</time>
                  </div>

                  <div className="relative aspect-square w-full bg-zinc-950">
                    {item.type === "image" ? (
                      <Image
                        src={item.src}
                        alt="Foto do álbum"
                        fill
                        priority
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 680px"
                      />
                    ) : (
                      <video
                        className="h-full w-full object-cover"
                        src={item.src}
                        controls
                        playsInline
                        preload="metadata"
                      />
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </main>

        <aside className="hidden pt-8 lg:block">
          {/* <div className="sticky top-24 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="text-sm font-medium text-zinc-200">Resumo</p>
            <p className="mt-2 text-sm text-zinc-400">{albumItems.length} posts no álbum</p>
          </div> */}
        </aside>
      </div>
    </div>
  );
}
