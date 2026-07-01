import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer id="contact" className="border-t border-blush-100 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-3">
        <div>
          <h3 className="text-2xl font-serif font-bold text-blush-600">
            Nail <span className="text-gold-500">Bar</span>
          </h3>
          <p className="mt-3 max-w-xs text-sm text-blush-800/80">
            A modern, minimal nail bar experience — premium services, warm hospitality, and a
            24/7 AI receptionist to help you book anytime.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-blush-900">Visit Us</h4>
          <ul className="mt-4 space-y-2 text-sm text-blush-800/80">
            <li>8970 E 96th St, Fishers, IN 46037</li>
            <li>
              <a href="tel:+13175550182" className="hover:text-blush-500">
                (317) 555-0182
              </a>
            </li>
            <li>
              <a href="mailto:hello@nailbar.com" className="hover:text-blush-500">
                hello@nailbar.com
              </a>
            </li>
            <li>Mon–Fri 9:30 AM–7:00 PM · Sat 9:30 AM–6:00 PM · Sun 11:00 AM–5:00 PM</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-blush-900">Quick Links</h4>
          <ul className="mt-4 space-y-2 text-sm text-blush-800/80">
            <li>
              <Link to="/booking" className="hover:text-blush-500">
                Book an Appointment
              </Link>
            </li>
            <li>
              <a href="#services" className="hover:text-blush-500">
                Services &amp; Pricing
              </a>
            </li>
            <li>
              <Link to="/admin/login" className="hover:text-blush-500">
                Staff Login
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-blush-100 py-6 text-center text-xs text-blush-800/60">
        © {new Date().getFullYear()} Nail Bar. All rights reserved.
      </div>
    </footer>
  );
}
