/**
 * Copy and configuration for the ad landing page (VSL funnel).
 *
 * Vietnamese only, on purpose: this page is the destination for Facebook ads
 * aimed at Vietnamese nail salon owners. A language toggle would only give a
 * cold visitor something to click other than the one button that matters.
 */

/**
 * The sales video. Accepts a YouTube/Vimeo embed URL or a direct MP4.
 * Empty string renders a "video coming soon" placeholder rather than a broken
 * player, so the page can ship and go live before the video is filmed.
 */
export const VSL_VIDEO_URL = process.env.NEXT_PUBLIC_VSL_VIDEO_URL ?? "";

/** Poster frame shown before the video loads. Optional. */
export const VSL_VIDEO_POSTER = process.env.NEXT_PUBLIC_VSL_VIDEO_POSTER ?? "";

export const VSL = {
  headline: "Tiệm nail của bạn mất bao nhiêu khách mỗi tuần chỉ vì không ai nghe điện thoại?",
  sub: "Lễ tân AI nghe máy, nhắn tin, đặt lịch và nhắc khách quay lại — chạy 24/7, không nghỉ, không quên.",

  step1Badge: "BƯỚC 1: Xem video 3 phút",
  videoCaption: "Xem lễ tân AI nhận cuộc gọi và đặt lịch thật, từ đầu đến cuối",
  videoPlaceholder: "Video đang được chuẩn bị. Bạn để lại thông tin bên dưới, chúng tôi gọi lại và demo trực tiếp cho bạn xem.",

  step2Badge: "BƯỚC 2",
  formTitle: "Đăng ký xem demo 1-1 miễn phí",
  formSub: "Để lại tên và số điện thoại. Chúng tôi gọi lại trong 24 giờ, xem tiệm bạn đang mất khách ở đâu và demo trực tiếp trên tiệm của bạn.",

  fields: {
    name: "Tên anh/chị",
    namePh: "Nguyễn Văn A",
    phone: "Số điện thoại",
    phonePh: "(317) 555-0182",
    salon: "Tên tiệm (không bắt buộc)",
    salonPh: "Nail Bar",
    city: "Thành phố (không bắt buộc)",
    cityPh: "Fishers, IN",
  },

  submit: "ĐĂNG KÝ XEM DEMO NGAY",
  submitting: "Đang gửi…",
  privacy: "Chúng tôi chỉ dùng số này để gọi lại cho anh/chị. Không bán, không chia sẻ, không spam.",

  successTitle: "Đã nhận thông tin!",
  successBody: "Cảm ơn anh/chị. Chúng tôi sẽ gọi lại trong vòng 24 giờ. Trong lúc chờ, anh/chị xem thử một tiệm mẫu đang chạy trên hệ thống:",
  successCta: "Xem tiệm mẫu",

  // Facts about the product, not invented statistics. Do not put a conversion
  // number or a client result here until there is a real salon to quote by
  // name — a made-up figure on an ad page is a lie that outlives the campaign.
  proofTitle: "AI làm được gì cho tiệm",
  proof: [
    { stat: "24/7", label: "Trực máy cả lúc bạn đang làm móng, lúc đóng cửa, lúc nghỉ lễ" },
    { stat: "Việt–Anh", label: "Nghe và trả lời được cả hai thứ tiếng, khách nói tiếng nào đáp tiếng đó" },
    { stat: "Đặt lịch", label: "Không chỉ trả lời — kiểm tra giờ trống và ghi lịch hẹn thật vào hệ thống" },
  ],

  faqTitle: "Anh/chị thường hỏi",
  faq: [
    { q: "Có phải thay tổng đài không?", a: "Không. Giữ nguyên số hiện tại, chỉ chuyển hướng cuộc gọi nhỡ sang AI. Khách vẫn gọi số cũ." },
    { q: "AI nói tiếng Việt được không?", a: "Được. Chọn tiếng Anh hoặc tiếng Việt. Khách nhắn tin tiếng Việt thì AI trả lời tiếng Việt." },
    { q: "Tôi không rành công nghệ.", a: "Không cần rành. Chúng tôi cài giúp trong buổi demo. Việc của anh/chị là nhập bảng giá, giờ mở cửa và tên thợ — khoảng 30 phút, làm một lần." },
  ],
} as const;
