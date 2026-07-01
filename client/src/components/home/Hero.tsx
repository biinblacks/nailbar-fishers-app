import { Link } from "react-router-dom";
import { useChat } from "../../context/ChatContext";

export function Hero() {
  const { open } = useChat();

  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-16 md:pt-24">
      <div
        aria-hidden
        className="absolute -top-24 right-[-10%] h-96 w-96 rounded-full bg-blush-200/50 blur-3xl animate-floatSlow"
      />
      <div
        aria-hidden
        className="absolute bottom-[-4rem] left-[-6rem] h-80 w-80 rounded-full bg-gold-100/60 blur-3xl animate-floatSlow"
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2">
        <div className="animate-fadeInUp">
          <span className="section-eyebrow">Fishers, Indiana</span>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-blush-900 md:text-6xl">
            Luxury nails,
            <br />
            <span className="text-blush-500">effortless</span> booking.
          </h1>
          <p className="mt-6 max-w-md text-base text-blush-800/80 md:text-lg">
            Premium manicures, pedicures, and Gel X in a modern, relaxing space — with an AI
            receptionist ready to answer questions and book your visit 24/7.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/booking" className="btn-primary">
              Book an Appointment
            </Link>
            <button onClick={open} className="btn-secondary">
              Chat with Us
            </button>
          </div>

          <div className="mt-10 flex items-center gap-6 text-sm text-blush-800/70">
            <div>
              <p className="text-2xl font-serif font-bold text-blush-600">4.9★</p>
              <p>Google Rating</p>
            </div>
            <div className="h-8 w-px bg-blush-100" />
            <div>
              <p className="text-2xl font-serif font-bold text-blush-600">24/7</p>
              <p>AI Booking</p>
            </div>
            <div className="h-8 w-px bg-blush-100" />
            <div>
              <p className="text-2xl font-serif font-bold text-blush-600">4</p>
              <p>Expert Techs</p>
            </div>
          </div>
        </div>

        <div className="relative animate-fadeInUp [animation-delay:150ms]">
          <div className="glass-card aspect-[4/5] w-full overflow-hidden p-2">
            <div className="flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-blush-100 via-white to-gold-50 text-center">
              <div className="px-8">
                <p className="text-sm uppercase tracking-[0.3em] text-gold-500">Signature</p>
                <p className="mt-2 font-serif text-3xl text-blush-700">Gel X Full Set</p>
                <p className="mt-2 text-blush-800/70">starts at $65</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
