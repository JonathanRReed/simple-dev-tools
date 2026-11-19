import JsonLd from '@/components/JsonLd';
import KeyRack from '@/components/home/KeyRack';
import PasteSlot from '@/components/home/PasteSlot';
import { toolListJsonLd } from '@/lib/structured-data';

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 py-4 sm:py-8">
      <JsonLd data={toolListJsonLd} />
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
        <h1 className="font-display text-[2.4rem] text-balance text-foreground sm:text-5xl lg:text-[2.6rem] xl:text-[3.2rem]">
          Developer tools that stay in your browser.
        </h1>
        <PasteSlot />
      </div>
      <KeyRack />
    </div>
  );
}
