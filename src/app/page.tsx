import fs from "node:fs/promises";
import path from "node:path";
import PostCarousel from "./post-carousel";

type AlbumMetadataEntry = {
  date?: string;
  location?: string;
  description?: string;
};

type AlbumMetadata = Record<string, AlbumMetadataEntry>;

type AlbumItem = {
  id: string;
  src: string;
  type: "image" | "video";
  dateKey: string;
  dateLabel: string;
  timestamp: number;
  location: string | null;
  description: string | null;
};

type AlbumPost = {
  id: string;
  dateKey: string;
  dateLabel: string;
  timestamp: number;
  items: AlbumItem[];
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

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
          src: `/album/${encodeURIComponent(entry)}`,
          type: isImage ? "image" : "video",
          dateKey: toDateKey(itemDate),
          dateLabel: formatDate(itemDate),
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
  const albumPostsMap = new Map<string, AlbumPost>();

  for (const item of albumItems) {
    const existingPost = albumPostsMap.get(item.dateKey);

    if (existingPost) {
      existingPost.items.push(item);
      continue;
    }

    albumPostsMap.set(item.dateKey, {
      id: item.dateKey,
      dateKey: item.dateKey,
      dateLabel: item.dateLabel,
      timestamp: item.timestamp,
      items: [item],
    });
  }

  const albumPosts = Array.from(albumPostsMap.values()).sort((a, b) => b.timestamp - a.timestamp);

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
            {albumPosts.length === 0 ? (
              <section className="mx-3 rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/60 p-8 text-center md:mx-0">
                <h1 className="text-xl font-semibold">Seu feed está vazio</h1>
                <p className="mt-3 text-sm text-zinc-400">
                  Coloque arquivos de imagem ou vídeo dentro de public/album para começar.
                </p>
              </section>
            ) : (
              albumPosts.map((post) => (
                <article key={post.id} className="overflow-hidden border-y border-zinc-800 bg-black md:rounded-xl md:border">
                  <div className="flex items-center justify-between px-4 py-3">
                    <p></p>
                    <time className="text-xs text-zinc-400">{post.dateLabel}</time>
                  </div>

                  <PostCarousel items={post.items} />
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
