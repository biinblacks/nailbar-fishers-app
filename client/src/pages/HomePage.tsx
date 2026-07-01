import { Hero } from "../components/home/Hero";
import { Services } from "../components/home/Services";
import { Gallery } from "../components/home/Gallery";
import { WhyChooseUs } from "../components/home/WhyChooseUs";
import { Testimonials } from "../components/home/Testimonials";
import { Contact } from "../components/home/Contact";

export function HomePage() {
  return (
    <>
      <Hero />
      <Services />
      <Gallery />
      <WhyChooseUs />
      <Testimonials />
      <Contact />
    </>
  );
}
