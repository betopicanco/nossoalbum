import fs from "node:fs/promises";
import path from "node:path";
import Image from "next/image";

type AlbumMetadataEntry = {
  date?: string;
  location?: string;
  description?: string;
};

type AlbumMetadata = Record<string, AlbumMetadataEntry>;

type AlbumItem = {
  id: string;
  filename: string;
  src: string;
  type: "image" | "video";
  date: string;
  timestamp: number;
  location: string | null;
  description: string | null;
};

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".ogg", ".m4v"]);
const ALBUM_DIR = path.join(process.cwd(), "public", "album");
const ALBUM_METADATA_FILE = path.join(ALBUM_DIR, "metadata.json");

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  }).format(date);
}

function getMetadataDate(dateValue: string | undefined, fallbackDate: Date) {
  if (!dateValue) {
    return fallbackDate;
  }

  // Parse YYYY-MM-DD respecting local timezone (not UTC)
  const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, yearStr, monthStr, dayStr] = match;
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1; // Month is 0-indexed
    const day = parseInt(dayStr);
    return new Date(year, month, day);
  }

  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? fallbackDate : parsed;
}

async function getAlbumMetadata(): Promise<AlbumMetadata> {
  try {
    const content = await fs.readFile(ALBUM_METADATA_FILE, "utf-8");
    const parsed = JSON.parse(content) as unknown;

    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return parsed as AlbumMetadata;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;

    if (code === "ENOENT" || error instanceof SyntaxError) {
      return {};
    }

    throw error;
  }
}

async function getAlbumItems(): Promise<AlbumItem[]> {
  try {
    const entries = await fs.readdir(ALBUM_DIR);
    const metadata = await getAlbumMetadata();

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

        const itemMetadata = metadata[entry];
        const itemDate = getMetadataDate(itemMetadata?.date, stats.mtime);
        const location = itemMetadata?.location?.trim() || null;
        const description = itemMetadata?.description?.trim() || null;

        return {
          id: `${entry}-${stats.mtimeMs}`,
          filename: entry,
          src: `/album/${encodeURIComponent(entry)}`,
          type: isImage ? "image" : "video",
          date: formatDate(itemDate),
          timestamp: itemDate.getTime(),
          location,
          description,
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
                    <p></p>
                    <time className="text-xs text-zinc-400">{item.date}</time>
                  </div>

                  <div className="relative w-full bg-zinc-950">
                    {item.location ? (
                      <div className="absolute top-3 left-3 z-10 text-[8px] font-semibold text-white bg-black/60 px-2 py-1 rounded backdrop-blur-sm">
                        {item.location}
                      </div>
                    ) : null}
                    {item.type === "image" ? (
                      <Image
                        src={item.src}
                        alt="Foto do álbum"
                        width={680}
                        height={900}
                        priority
                        className="w-full h-auto"
                        sizes="(max-width: 768px) 100vw, 680px"
                      />
                    ) : (
                      <video
                        className="h-full w-full object-cover"
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="auto"
                      >
                        <source src={item.src} type="video/mp4" />
                        Seu navegador não conseguiu reproduzir este vídeo.
                      </video>
                    )}
                  </div>

                  <div className="space-y-1 px-4 py-3 text-sm">
                    {item.description ? <p className="text-zinc-200">{item.description}</p> : null}
                  </div>
                </article>
              ))
            )}
          </div>
        </main>

        <aside className="hidden pt-8 lg:block">
        </aside>
      </div>
    </div>
  );
}
