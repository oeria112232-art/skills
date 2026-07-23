import React from "react";

export interface OfficialCertificateProps {
  recipientName?: string | null;
  workshopTitle?: string | null;
  issueDate?: string | null;
  certSignTitle?: string | null;
  certSignName?: string | null;
  certEkey?: string | null;
  certTemplateUrl?: string | null;
  certTemplateType?: string | null;
  updatedAt?: string | null;
  isAr?: boolean;
  certType?: "participation" | "achievement" | "track" | null;
  verificationCode?: string | null;
  signatureHash?: string | null;
}

export const OfficialCertificate: React.FC<OfficialCertificateProps> = ({
  recipientName,
  workshopTitle,
  issueDate,
  certSignTitle,
  certSignName,
  certEkey,
  certTemplateUrl,
  certTemplateType,
  updatedAt,
  isAr = false,
  certType = "participation",
  verificationCode,
  signatureHash,
}) => {
  const isImageUrl = (url?: string | null) => {
    if (!url) return false;
    const cleanUrl = url.split("?")[0].split("#")[0].toLowerCase();
    return (
      cleanUrl.endsWith(".png") ||
      cleanUrl.endsWith(".jpg") ||
      cleanUrl.endsWith(".jpeg") ||
      cleanUrl.endsWith(".svg") ||
      cleanUrl.endsWith(".webp")
    );
  };

  const hasCustomImage = !!certTemplateUrl && (
    certTemplateType === "png" ||
    certTemplateType === "jpg" ||
    certTemplateType === "jpeg" ||
    certTemplateType === "svg" ||
    certTemplateType === "webp" ||
    certTemplateType?.startsWith("image/") ||
    isImageUrl(certTemplateUrl)
  );

  const cacheBuster = updatedAt ? new Date(updatedAt).getTime() : Date.now();

  const formattedDate = issueDate || new Date().toLocaleDateString(isAr ? "ar-EG" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const displayRecipient = recipientName || (isAr ? "مقتدى علي منصور" : "Muqtada Ali Mansour");
  const displayWorkshop = workshopTitle || (isAr ? "مهارات التوظيف وبناء المسار المهني" : "Recruitment skills and career path building");
  const displaySignTitle = certSignTitle || "TRAINER";
  const displaySignName = certSignName || "Ahmed Joudah Ghafil";
  const displayEkey = certEkey || "MHARAT-SECURE-ESIGN-88192-VERIFIED";

  return (
    <div
      className="relative w-full overflow-hidden text-slate-850 p-6 sm:p-12 border-2 shadow-2xl aspect-[1.414/1] flex flex-col justify-between select-none rounded-none print:shadow-none print:border-none certificate-print-container"
      style={{
        fontFamily: "'Lora', 'Georgia', 'Times New Roman', serif",
        backgroundColor: "#FAF7F2",
        backgroundImage: hasCustomImage
          ? `url(${certTemplateUrl}?v=${cacheBuster})`
          : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Cdefs%3E%3Cpattern id='guillochePattern' width='120' height='30' patternUnits='userSpaceOnUse' patternTransform='rotate(10)'%3E%3Cpath d='M0,10 C30,0 60,20 90,10 S120,0 150,10' fill='none' stroke='%23e4dacb' stroke-width='0.5' opacity='0.55'/%3E%3Cpath d='M0,20 C30,10 60,30 90,20 S120,10 150,20' fill='none' stroke='%23e4dacb' stroke-width='0.5' opacity='0.55'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='%23FCFAF6'/%3E%3Crect width='100%25' height='100%25' fill='url(%23guillochePattern)'/%3E%3C/svg%3E")`,
        backgroundSize: hasCustomImage ? "cover" : "auto",
        backgroundPosition: hasCustomImage ? "center" : "top left",
        borderColor: "#4a443e",
      }}
    >
      {/* 100% Replica Frame: Double Borders & Victorian Scrollwork Corners */}
      {!hasCustomImage && (
        <>
          {/* Outer Border */}
          <div className="absolute inset-4 border-2 border-[#4a443e] pointer-events-none rounded-none" />
          {/* Inner Thin Border */}
          <div className="absolute inset-5.5 border border-[#5c544a] pointer-events-none rounded-none" />

          {/* Top-Left Corner Flourish */}
          <div className="absolute top-6.5 left-6.5 pointer-events-none text-[#4a443e]">
            <svg viewBox="0 0 120 120" className="w-16 h-16 sm:w-20 sm:h-20 text-current">
              <path d="M10,10 C30,10 50,15 65,22 C55,28 40,24 30,18 C45,30 35,48 20,48 C22,35 28,26 35,22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M10,10 C10,30 15,50 22,65 C28,55 24,40 18,30 C30,45 48,35 48,20 C35,22 26,28 22,35" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M22,22 C35,35 45,45 55,55 C48,60 38,50 32,42 C42,52 32,70 18,70 C16,55 20,44 28,38" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M10,10 Q25,25 35,35 C38,32 42,32 45,35 C48,38 48,42 45,45 C42,48 38,48 35,45 Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="40" cy="40" r="2" fill="currentColor" />
              <circle cx="10" cy="10" r="3" fill="currentColor" />
              <path d="M65,22 C80,26 95,20 105,10 C95,10 88,14 82,18" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22,65 C26,80 20,95 10,105 C10,95 14,88 18,82" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="105" cy="10" r="2" fill="currentColor" />
              <circle cx="10" cy="105" r="2" fill="currentColor" />
            </svg>
          </div>

          {/* Top-Right Corner Flourish */}
          <div className="absolute top-6.5 right-6.5 pointer-events-none scale-x-[-1] text-[#4a443e]">
            <svg viewBox="0 0 120 120" className="w-16 h-16 sm:w-20 sm:h-20 text-current">
              <path d="M10,10 C30,10 50,15 65,22 C55,28 40,24 30,18 C45,30 35,48 20,48 C22,35 28,26 35,22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M10,10 C10,30 15,50 22,65 C28,55 24,40 18,30 C30,45 48,35 48,20 C35,22 26,28 22,35" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M22,22 C35,35 45,45 55,55 C48,60 38,50 32,42 C42,52 32,70 18,70 C16,55 20,44 28,38" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M10,10 Q25,25 35,35 C38,32 42,32 45,35 C48,38 48,42 45,45 C42,48 38,48 35,45 Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="40" cy="40" r="2" fill="currentColor" />
              <circle cx="10" cy="10" r="3" fill="currentColor" />
              <path d="M65,22 C80,26 95,20 105,10 C95,10 88,14 82,18" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22,65 C26,80 20,95 10,105 C10,95 14,88 18,82" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="105" cy="10" r="2" fill="currentColor" />
              <circle cx="10" cy="105" r="2" fill="currentColor" />
            </svg>
          </div>

          {/* Bottom-Left Corner Flourish */}
          <div className="absolute bottom-6.5 left-6.5 pointer-events-none scale-y-[-1] text-[#4a443e]">
            <svg viewBox="0 0 120 120" className="w-16 h-16 sm:w-20 sm:h-20 text-current">
              <path d="M10,10 C30,10 50,15 65,22 C55,28 40,24 30,18 C45,30 35,48 20,48 C22,35 28,26 35,22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M10,10 C10,30 15,50 22,65 C28,55 24,40 18,30 C30,45 48,35 48,20 C35,22 26,28 22,35" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M22,22 C35,35 45,45 55,55 C48,60 38,50 32,42 C42,52 32,70 18,70 C16,55 20,44 28,38" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M10,10 Q25,25 35,35 C38,32 42,32 45,35 C48,38 48,42 45,45 C42,48 38,48 35,45 Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="40" cy="40" r="2" fill="currentColor" />
              <circle cx="10" cy="10" r="3" fill="currentColor" />
              <path d="M65,22 C80,26 95,20 105,10 C95,10 88,14 82,18" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22,65 C26,80 20,95 10,105 C10,95 14,88 18,82" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="105" cy="10" r="2" fill="currentColor" />
              <circle cx="10" cy="105" r="2" fill="currentColor" />
            </svg>
          </div>

          {/* Bottom-Right Corner Flourish */}
          <div className="absolute bottom-6.5 right-6.5 pointer-events-none scale-x-[-1] scale-y-[-1] text-[#4a443e]">
            <svg viewBox="0 0 120 120" className="w-16 h-16 sm:w-20 sm:h-20 text-current">
              <path d="M10,10 C30,10 50,15 65,22 C55,28 40,24 30,18 C45,30 35,48 20,48 C22,35 28,26 35,22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M10,10 C10,30 15,50 22,65 C28,55 24,40 18,30 C30,45 48,35 48,20 C35,22 26,28 22,35" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M22,22 C35,35 45,45 55,55 C48,60 38,50 32,42 C42,52 32,70 18,70 C16,55 20,44 28,38" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M10,10 Q25,25 35,35 C38,32 42,32 45,35 C48,38 48,42 45,45 C42,48 38,48 35,45 Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="40" cy="40" r="2" fill="currentColor" />
              <circle cx="10" cy="10" r="3" fill="currentColor" />
              <path d="M65,22 C80,26 95,20 105,10 C95,10 88,14 82,18" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22,65 C26,80 20,95 10,105 C10,95 14,88 18,82" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="105" cy="10" r="2" fill="currentColor" />
              <circle cx="10" cy="105" r="2" fill="currentColor" />
            </svg>
          </div>
        </>
      )}

      {/* Header Section: Skills of Youth */}
      {!hasCustomImage ? (
        <div className="text-center pt-3 sm:pt-6 z-10 flex flex-col items-center">
          <div className="inline-block border-b border-[#1f1d1a] pb-0.5 mb-1">
            <h1 className="text-xl sm:text-3xl font-extrabold text-[#1a1816] tracking-tight font-serif">
              Skills of youth
            </h1>
          </div>
          <p className="text-[10px] sm:text-xs text-[#4d473f] font-serif font-medium tracking-wide">
            For educational and
          </p>

          <h2 className="text-lg sm:text-3xl font-medium text-[#2b2723] font-serif mt-4 sm:mt-6 tracking-wide leading-none">
            {certType === "track"
              ? (isAr ? "شهادة إتمام مسار" : "Certificate of achievement")
              : certType === "achievement"
                ? (isAr ? "شهادة اجتياز ورشة عمل" : "Certificate of achievement")
                : (isAr ? "شهادة مشاركة وحضور" : "Certificate of participation")}
          </h2>
        </div>
      ) : (
        <div className="h-12" />
      )}

      {/* Main Certificate Body */}
      <div className={`text-center max-w-xl mx-auto space-y-3 sm:space-y-4 z-10 ${hasCustomImage ? 'mt-24 sm:mt-32' : 'mt-4'}`}>
        <p className="text-[10px] sm:text-xs text-[#3a3530] font-sans font-bold uppercase tracking-wider">
          {isAr ? "نشهد أن المتدرب(ة):" : "This is to certify that"}
        </p>

        <h3 className="text-lg sm:text-3xl font-extrabold text-[#111111] font-sans my-1 tracking-wide">
          ({displayRecipient})
        </h3>

        <p className="text-[10px] sm:text-xs text-[#3a3530] font-sans font-bold leading-relaxed max-w-md mx-auto">
          {certType === "track"
            ? (isAr ? "قد أكمل بنجاح المسار التعليمي المعتمد والموثق بعنوان:" : "Has successfully completed the verified learning track entitled")
            : certType === "achievement"
              ? (isAr ? "قد اجتاز بنجاح الورشة التدريبية والاختبار التقييمي المعتمد لـ:" : "Has successfully completed and passed the exam for")
              : (isAr ? "قد شارك بنجاح في الورشة التدريبية بعنوان:" : "Has successfully participated in the training webinar entitled")}
        </p>

        <h4 className="text-xs sm:text-xl font-extrabold text-[#000000] font-serif max-w-lg mx-auto leading-normal px-2">
          " {displayWorkshop} "
        </h4>

        <p className="text-xs sm:text-base font-extrabold text-[#1a1816] font-sans tracking-wide mt-2">
          {formattedDate}
        </p>
      </div>

      {/* Footer Signatures & Central Scalloped Stamp */}
      {!hasCustomImage ? (
        <div className="grid grid-cols-3 gap-2 sm:gap-6 items-end text-center z-10 pb-1 sm:pb-3 px-4 sm:px-12">
          {/* Left Signature: CEO */}
          <div className="space-y-1">
            <div className="h-12 flex items-center justify-center">
              <svg viewBox="0 0 120 50" className="w-28 h-12 text-[#1a1816]">
                <path d="M 10,38 C 40,34 75,36 110,34" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M 20,32 C 15,28 35,10 45,8 C 55,6 60,18 45,26 C 30,34 25,25 35,20 C 50,12 70,14 85,22 C 95,27 100,18 92,12 C 85,6 78,12 80,22 C 82,32 105,24 95,30" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 68,16 L 78,28 M 74,15 L 84,27" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="border-t border-[#38332c] pt-1 font-sans">
              <p className="font-extrabold text-[8px] sm:text-[9.5px] uppercase tracking-wider text-[#474138]">
                CEO OF SKILLS
              </p>
              <p className="text-[9px] sm:text-[10.5px] font-bold text-[#1f1d1a] mt-0.5">
                Ahmed Joudah Ghafil
              </p>
            </div>
          </div>

          {/* Center Stamp: Scalloped SKILLS Badge */}
          <div className="flex flex-col items-center justify-center pb-1">
            <div className="relative flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-12 h-12 sm:w-16 sm:h-16 text-[#3d3832] drop-shadow-md">
                {/* 16-point Scalloped Star Circle */}
                <path d="M50,4 C54,4 57,9 61,10 C65,11 70,9 73,12 C76,15 75,20 78,24 C81,27 86,28 88,32 C90,36 87,41 88,45 C89,49 92,54 91,58 C90,62 85,65 84,69 C83,73 85,78 82,81 C79,84 74,83 70,85 C66,87 63,91 59,92 C55,93 50,89 46,89 C42,89 37,93 33,92 C29,91 26,87 22,85 C18,83 13,84 10,81 C7,78 9,73 8,69 C7,65 2,62 1,58 C0,54 3,49 4,45 C5,41 2,36 4,32 C6,28 11,27 14,24 C17,20 27,11 31,10 C35,9 38,4 42,4 Z" fill="currentColor" />
                <circle cx="50" cy="48" r="38" fill="none" stroke="white" strokeWidth="1" opacity="0.2" />
                {/* Triple bar icon */}
                <rect x="32" y="25" width="36" height="6" rx="3" fill="white" />
                <rect x="32" y="35" width="36" height="6" rx="3" fill="white" />
                <rect x="32" y="45" width="36" height="6" rx="3" fill="white" />
                {/* SKILLS text */}
                <text x="50" y="68" textAnchor="middle" fill="white" fontSize="10" fontWeight="900" letterSpacing="1.5" fontFamily="sans-serif">SKILLS</text>
              </svg>
            </div>
          </div>

          {/* Right Signature: Trainer */}
          <div className="space-y-1">
            <div className="h-12 flex items-center justify-center">
              <svg viewBox="0 0 120 50" className="w-28 h-12 text-[#1a1816]">
                <path d="M 10,38 C 40,34 75,36 110,34" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M 20,32 C 15,28 35,10 45,8 C 55,6 60,18 45,26 C 30,34 25,25 35,20 C 50,12 70,14 85,22 C 95,27 100,18 92,12 C 85,6 78,12 80,22 C 82,32 105,24 95,30" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 68,16 L 78,28 M 74,15 L 84,27" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="border-t border-[#38332c] pt-1 font-sans">
              <p className="font-extrabold text-[8px] sm:text-[9.5px] uppercase tracking-wider text-[#474138]">
                {displaySignTitle}
              </p>
              <p className="text-[9px] sm:text-[10.5px] font-bold text-[#1f1d1a] mt-0.5">
                {displaySignName}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-16" />
      )}

      {/* Subtle Cryptographic E-Key Footer (Non-disruptive) */}
      <div className="text-center font-mono text-[6px] sm:text-[7.5px] text-[#857b6e] border-t border-dashed border-[#d6cebf] pt-1 mt-1 select-all no-print">
        <span className="font-bold tracking-tight">
          HASH: {signatureHash || displayEkey} • VERIFICATION CODE: {verificationCode || "MH-VFY-SECURE-88192"}
        </span>
      </div>
    </div>
  );
};
