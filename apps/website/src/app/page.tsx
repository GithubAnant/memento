import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { ProjectCards } from "@/components/ProjectCards";
import { Story } from "@/components/Story";
import { DownloadCta } from "@/components/DownloadCta";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <ProjectCards />
        <Story />
        <DownloadCta />
      </main>
      <Footer />
    </>
  );
}
