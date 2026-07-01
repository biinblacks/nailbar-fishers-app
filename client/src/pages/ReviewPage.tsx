import { Link, useSearchParams } from "react-router-dom";
import { Card } from "../components/ui/Card";

const GOOGLE_REVIEW_LINK = "https://g.page/r/nailbar/review";

export function ReviewPage() {
  const [params] = useSearchParams();
  const name = params.get("name");

  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <Card className="animate-fadeInUp">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold-50 text-3xl">
          🎉
        </div>
        <h1 className="mt-6 text-2xl font-bold text-blush-900">
          Thank you{name ? `, ${name}` : ""}, for visiting us!
        </h1>
        <p className="mt-3 text-2xl text-gold-400">★★★★★</p>
        <p className="mt-4 text-sm text-blush-800/70">
          We hope you loved your experience at Nail Bar. If you have a moment, we'd be so
          grateful if you could share your feedback with a Google Review — it helps our small
          business grow.
        </p>

        <a
          href={GOOGLE_REVIEW_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-gold mt-8 w-full"
        >
          Leave a Google Review
        </a>

        <Link to="/" className="mt-4 block text-sm text-blush-500 hover:underline">
          Back to Home
        </Link>
      </Card>
    </div>
  );
}
