/**
 * Landing page copy, Vietnamese first.
 *
 * The buyer is a Vietnamese nail salon owner, so `vi` is the default and the
 * tone is plain spoken — no corporate marketing voice. Prices are NOT here:
 * they come from lib/billing/plans.ts so the page can never drift from what
 * Stripe actually charges.
 */

export type Lang = "vi" | "en";

export interface Copy {
  nav: { login: string; start: string; demo: string };
  hero: { badge: string; title: string; highlight: string; sub: string; cta: string; ctaSub: string; demo: string };
  pains: { title: string; items: Array<{ q: string; a: string }> };
  features: { title: string; sub: string; items: Array<{ icon: FeatureIcon; name: string; body: string }> };
  demo: { title: string; body: string; cta: string; note: string };
  pricing: { title: string; sub: string; month: string; free: string; cta: string; ctaFree: string; note: string; popular: string };
  planCopy: Record<"starter" | "pro" | "premium", { tagline: string; features: string[] }>;
  faq: { title: string; items: Array<{ q: string; a: string }> };
  cta: { title: string; sub: string; button: string };
  footer: string;
}

export type FeatureIcon = "phone" | "calendar" | "translate" | "bell" | "megaphone" | "lock";

export const COPY: Record<Lang, Copy> = {
  vi: {
    nav: { login: "Đăng nhập", start: "Dùng thử miễn phí", demo: "Xem demo" },
    hero: {
      badge: "Dành cho tiệm nail",
      title: "Lễ tân AI trả lời khách,",
      highlight: "kể cả khi bạn đang làm móng",
      sub: "Nghe điện thoại, nhắn tin, đặt lịch, nhắc khách quay lại, và phiên dịch Việt–Anh ngay tại ghế. Một phần mềm thay cho cả người trực quầy.",
      cta: "Dùng thử miễn phí",
      ctaSub: "Không cần thẻ tín dụng",
      demo: "Xem tiệm mẫu",
    },
    pains: {
      title: "Nghe quen không?",
      items: [
        { q: "Đang làm móng, chuông reo mà không bắt máy được.", a: "AI nghe máy, báo giá, báo giờ mở cửa và đặt lịch giúp bạn. Ai đòi gặp người thật thì nó chuyển máy." },
        { q: "Khách nói tiếng Anh, thợ nói tiếng Việt.", a: "Bee Interpreter dịch hai chiều ngay tại ghế, có sẵn 30 câu mẫu chuyên ngành nail." },
        { q: "Khách hẹn rồi không tới. Làm xong rồi mất luôn.", a: "Tự nhắn nhắc lịch, xin đánh giá Google, và nhắn khách lâu ngày chưa quay lại." },
      ],
    },
    features: {
      title: "Sáu thứ chạy sẵn trong một tài khoản",
      sub: "Không phải mua sáu phần mềm rời rồi tự ghép.",
      items: [
        { icon: "phone", name: "Lễ tân AI", body: "Trả lời điện thoại, tin nhắn và chat trên web. Biết bảng giá, giờ mở cửa, dịch vụ của riêng tiệm bạn vì nó đọc thẳng từ dữ liệu bạn nhập." },
        { icon: "calendar", name: "Đặt lịch online", body: "Khách tự chọn dịch vụ, thợ và giờ trống. Hệ thống tự tránh trùng giờ, tránh quá tải ghế." },
        { icon: "translate", name: "Bee Interpreter", body: "Phiên dịch Việt–Anh hai chiều bằng giọng nói. Nói tiếng Việt, máy đọc tiếng Anh cho khách nghe, và ngược lại." },
        { icon: "bell", name: "Nhắn tin tự động", body: "Nhắc lịch hẹn, xin review Google, nhắc khách lâu chưa quay lại, chúc sinh nhật, hỏi thăm khách mới." },
        { icon: "megaphone", name: "Marketing AI", body: "Viết caption Facebook và Instagram, ý tưởng khuyến mãi, mô tả ảnh và video. Hẹn giờ đăng luôn." },
        { icon: "lock", name: "Dữ liệu riêng của bạn", body: "Mỗi tiệm một tài khoản riêng biệt. Khách hàng, lịch hẹn, doanh thu của bạn không ai khác xem được." },
      ],
    },
    demo: {
      title: "Bấm thử trước khi đăng ký",
      body: "Đây là một tiệm mẫu chạy thật trên hệ thống. Bạn xem được trang tiệm, bảng giá, và thử đặt một lịch hẹn như một người khách.",
      cta: "Mở tiệm mẫu",
      note: "Không cần tài khoản",
    },
    pricing: {
      title: "Giá minh bạch",
      sub: "Bắt đầu miễn phí. Đông khách rồi hãy nâng cấp.",
      month: "/tháng",
      free: "Miễn phí",
      cta: "Chọn gói này",
      ctaFree: "Bắt đầu miễn phí",
      note: "Huỷ bất cứ lúc nào. Không ràng buộc hợp đồng.",
      popular: "Phổ biến nhất",
    },
    planCopy: {
      starter: {
        tagline: "Đủ để chạy một tiệm nhỏ.",
        features: ["Trang tiệm + đặt lịch online", "Lễ tân AI, 300 tin nhắn/tháng", "Bee Interpreter không giới hạn", "Nhắc lịch hẹn, 100 SMS/tháng", "3 gói nội dung marketing/tháng", "Tối đa 3 thợ"],
      },
      pro: {
        tagline: "Cho tiệm đông khách quen.",
        features: ["Toàn bộ gói Starter", "Tối đa 10 thợ", "Lễ tân AI, 3.000 tin nhắn/tháng", "Đầy đủ nhắn tin tự động, 1.000 SMS/tháng", "30 gói nội dung marketing/tháng", "Tự đăng bài lên Facebook và Instagram"],
      },
      premium: {
        tagline: "Tiệm lớn nhiều ghế hoặc chuỗi tiệm.",
        features: ["Toàn bộ gói Pro", "Không giới hạn số thợ", "Lễ tân AI, 15.000 tin nhắn/tháng", "5.000 SMS/tháng", "Nội dung marketing không giới hạn", "Tên miền riêng của tiệm", "Hỗ trợ ưu tiên"],
      },
    },
    faq: {
      title: "Câu hỏi thường gặp",
      items: [
        { q: "Tôi không rành công nghệ, dùng được không?", a: "Được. Bạn nhập bảng giá, tên thợ và giờ mở cửa một lần, xong. Mọi thứ còn lại chạy tự động. Nhập lần đầu mất khoảng 30 phút." },
        { q: "AI có nói tiếng Việt không?", a: "Có. Khách nhắn tiếng Việt thì AI trả lời tiếng Việt. Phần nghe điện thoại chọn được tiếng Anh hoặc tiếng Việt." },
        { q: "Có cần mua số điện thoại mới không?", a: "Chỉ khi bạn muốn AI nghe máy hoặc nhắn tin. Phần trang tiệm, đặt lịch online và phiên dịch thì không cần." },
        { q: "Dữ liệu khách hàng của tôi có an toàn không?", a: "Mỗi tiệm nằm trong khu vực riêng của database, chặn ở tầng thấp nhất. Tiệm khác không đọc được dữ liệu của bạn kể cả khi cố tình." },
      ],
    },
    cta: { title: "Thử miễn phí hôm nay", sub: "Không cần thẻ. Không cần cài đặt gì. Mở trình duyệt là chạy.", button: "Tạo tài khoản miễn phí" },
    footer: "Phần mềm quản lý tiệm nail",
  },

  en: {
    nav: { login: "Sign in", start: "Start free", demo: "See demo" },
    hero: {
      badge: "Built for nail salons",
      title: "An AI receptionist that answers,",
      highlight: "even when your hands are busy",
      sub: "It picks up the phone, replies to texts, books appointments, wins guests back, and translates Vietnamese and English right at the chair. One tool instead of a front desk.",
      cta: "Start free",
      ctaSub: "No credit card needed",
      demo: "See a live salon",
    },
    pains: {
      title: "Sound familiar?",
      items: [
        { q: "The phone rings while your hands are in the middle of a set.", a: "The AI answers, quotes prices and hours, and books the appointment. Anyone who asks for a person gets transferred." },
        { q: "Your guest speaks English. Your tech speaks Vietnamese.", a: "Bee Interpreter translates both ways at the chair, with 30 nail-specific phrases built in." },
        { q: "Guests no-show. Or come once and vanish.", a: "Automatic reminders, Google review requests, and win-back texts for guests who have not been in for a while." },
      ],
    },
    features: {
      title: "Six tools, one account",
      sub: "Instead of buying six products and wiring them together yourself.",
      items: [
        { icon: "phone", name: "AI receptionist", body: "Answers calls, texts and web chat. It knows your prices, hours and services because it reads them straight from your own data." },
        { icon: "calendar", name: "Online booking", body: "Guests pick a service, a technician and a real open slot. Double bookings and chair overload are handled for you." },
        { icon: "translate", name: "Bee Interpreter", body: "Two-way Vietnamese-English translation by voice. Speak Vietnamese, your guest hears English, and back again." },
        { icon: "bell", name: "Automated messages", body: "Appointment reminders, Google review requests, win-back nudges, birthday offers and new-guest follow-ups." },
        { icon: "megaphone", name: "AI marketing", body: "Facebook and Instagram captions, promotion ideas, image and video prompts. Schedule the posts too." },
        { icon: "lock", name: "Your data stays yours", body: "Every salon is isolated at the database level. No other salon can read your guests, bookings or revenue." },
      ],
    },
    demo: {
      title: "Click around before you sign up",
      body: "This is a real salon running on the platform. Browse the storefront, read the menu, and book an appointment the way a guest would.",
      cta: "Open the demo salon",
      note: "No account needed",
    },
    pricing: {
      title: "Simple pricing",
      sub: "Start free. Upgrade when you get busy.",
      month: "/month",
      free: "Free",
      cta: "Choose this plan",
      ctaFree: "Start free",
      note: "Cancel anytime. No contract.",
      popular: "Most popular",
    },
    planCopy: {
      starter: {
        tagline: "Everything to run one small salon.",
        features: ["Storefront + online booking", "AI receptionist, 300 replies/mo", "Unlimited Bee Interpreter", "Appointment reminders, 100 SMS/mo", "3 marketing packs/mo", "Up to 3 technicians"],
      },
      pro: {
        tagline: "For busy salons that live on repeat guests.",
        features: ["Everything in Starter", "Up to 10 technicians", "AI receptionist, 3,000 replies/mo", "All automations, 1,000 SMS/mo", "30 marketing packs/mo", "Auto-publish to Facebook and Instagram"],
      },
      premium: {
        tagline: "Multi-chair salons and small chains.",
        features: ["Everything in Pro", "Unlimited technicians", "AI receptionist, 15,000 replies/mo", "5,000 SMS/mo", "Unlimited marketing packs", "Your own custom domain", "Priority support"],
      },
    },
    faq: {
      title: "Common questions",
      items: [
        { q: "I am not technical. Can I still use it?", a: "Yes. Enter your menu, your technicians and your hours once, and the rest runs itself. First-time setup takes about 30 minutes." },
        { q: "Does the AI speak Vietnamese?", a: "Yes. If a guest writes in Vietnamese, it answers in Vietnamese. Phone answering can run in English or Vietnamese." },
        { q: "Do I need a new phone number?", a: "Only if you want the AI to answer calls or texts. The storefront, online booking and interpreter work without one." },
        { q: "Is my guest data safe?", a: "Each salon lives in its own slice of the database, enforced at the lowest level. Another salon cannot read your data even if it tried." },
      ],
    },
    cta: { title: "Try it free today", sub: "No card. Nothing to install. It runs in your browser.", button: "Create a free account" },
    footer: "Salon management software",
  },
};
