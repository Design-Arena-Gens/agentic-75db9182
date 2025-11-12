import './globals.css';
import dynamic from 'next/dynamic';

const VideoShortsGenerator = dynamic(() => import('../components/VideoShortsGenerator'), { ssr: false });

export default function Page() {
  return (
    <main className="container-max py-10">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">YouTube Shorts Generator</h1>
        <p className="text-neutral-300 mt-2 max-w-2xl">Create vertical 9:16 shorts from any video file in your browser. No uploads, no server required.</p>
      </header>
      <section className="card p-4 md:p-6">
        <VideoShortsGenerator />
      </section>
      <footer className="mt-8 text-center text-neutral-400 text-sm">
        Built with ffmpeg.wasm. Runs entirely client-side.
      </footer>
    </main>
  );
}
