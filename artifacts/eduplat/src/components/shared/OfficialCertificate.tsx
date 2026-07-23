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
          : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Cdefs%3E%3Cpattern id='wavePattern' width='200' height='20' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 0,10 Q 50,0 100,10 T 200,10' fill='none' stroke='%23e0d8cc' stroke-width='0.6' opacity='0.35'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='%23FAF7F2'/%3E%3Crect width='100%25' height='100%25' fill='url(%23wavePattern)'/%3E%3C/svg%3E")`,
        backgroundSize: hasCustomImage ? "cover" : "auto",
        backgroundPosition: hasCustomImage ? "center" : "top left",
        borderColor: "#4a443e",
      }}
    >
      {/* 100% Replica Frame: Double Borders & Victorian Scrollwork Corners */}
      {!hasCustomImage && (
        <>
          {/* Outer Border */}
          <div className="absolute inset-3 border-2 border-[#4a443e] pointer-events-none rounded-none" />
          {/* Inner Thin Border */}
          <div className="absolute inset-4.5 border border-[#5c544a] pointer-events-none rounded-none" />

          {/* Top-Left Corner Flourish */}
          <div className="absolute top-5 left-5 pointer-events-none text-[#4a443e]">
            <svg viewBox="0 0 100 100" className="w-14 h-14 sm:w-16 sm:h-16 text-current">
              <path d="M5,5 C35,5 45,12 55,25 C45,35 30,30 20,20 C35,35 25,55 5,55" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M5,5 C5,25 12,45 25,55 C35,45 30,30 20,20 C35,35 55,25 55,5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="20" cy="20" r="4" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="20" cy="20" r="1.5" fill="currentColor" />
              <circle cx="5" cy="5" r="2.5" fill="currentColor" />
              <path d="M12,20 C10,35 25,40 35,30 C40,20 30,12 20,12" fill="none" stroke="currentColor" strokeWidth="0.8" />
            </svg>
          </div>

          {/* Top-Right Corner Flourish */}
          <div className="absolute top-5 right-5 pointer-events-none scale-x-[-1] text-[#4a443e]">
            <svg viewBox="0 0 100 100" className="w-14 h-14 sm:w-16 sm:h-16 text-current">
              <path d="M5,5 C35,5 45,12 55,25 C45,35 30,30 20,20 C35,35 25,55 5,55" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M5,5 C5,25 12,45 25,55 C35,45 30,30 20,20 C35,35 55,25 55,5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="20" cy="20" r="4" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="20" cy="20" r="1.5" fill="currentColor" />
              <circle cx="5" cy="5" r="2.5" fill="currentColor" />
              <path d="M12,20 C10,35 25,40 35,30 C40,20 30,12 20,12" fill="none" stroke="currentColor" strokeWidth="0.8" />
            </svg>
          </div>

          {/* Bottom-Left Corner Flourish */}
          <div className="absolute bottom-5 left-5 pointer-events-none scale-y-[-1] text-[#4a443e]">
            <svg viewBox="0 0 100 100" className="w-14 h-14 sm:w-16 sm:h-16 text-current">
              <path d="M5,5 C35,5 45,12 55,25 C45,35 30,30 20,20 C35,35 25,55 5,55" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M5,5 C5,25 12,45 25,55 C35,45 30,30 20,20 C35,35 55,25 55,5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="20" cy="20" r="4" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="20" cy="20" r="1.5" fill="currentColor" />
              <circle cx="5" cy="5" r="2.5" fill="currentColor" />
              <path d="M12,20 C10,35 25,40 35,30 C40,20 30,12 20,12" fill="none" stroke="currentColor" strokeWidth="0.8" />
            </svg>
          </div>

          {/* Bottom-Right Corner Flourish */}
          <div className="absolute bottom-5 right-5 pointer-events-none scale-x-[-1] scale-y-[-1] text-[#4a443e]">
            <svg viewBox="0 0 100 100" className="w-14 h-14 sm:w-16 sm:h-16 text-current">
              <path d="M5,5 C35,5 45,12 55,25 C45,35 30,30 20,20 C35,35 25,55 5,55" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M5,5 C5,25 12,45 25,55 C35,45 30,30 20,20 C35,35 55,25 55,5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="20" cy="20" r="4" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="20" cy="20" r="1.5" fill="currentColor" />
              <circle cx="5" cy="5" r="2.5" fill="currentColor" />
              <path d="M12,20 C10,35 25,40 35,30 C40,20 30,12 20,12" fill="none" stroke="currentColor" strokeWidth="0.8" />
            </svg>
          </div>
        </>
      )}

      {/* Header Section: Skills of Youth */}
      {!hasCustomImage ? (
        <div className="text-center pt-2 sm:pt-4 z-10 flex flex-col items-center">
          <div className="inline-block border-b-2 border-[#1f1d1a] pb-0.5">
            <h1 className="text-xl sm:text-3xl font-extrabold text-[#1a1816] tracking-tight font-serif">
              Skills of youth
            </h1>
          </div>
          <p className="text-[9px] sm:text-xs text-[#4d473f] font-serif mt-1 font-medium tracking-wide">
            For educational and pedagogical services
          </p>

          <h2 className="text-lg sm:text-2xl font-bold text-[#2b2723] font-sans mt-3 sm:mt-4 tracking-wide">
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
      <div className={`text-center max-w-xl mx-auto space-y-2 sm:space-y-3 z-10 ${hasCustomImage ? 'mt-24 sm:mt-32' : ''}`}>
        <p className="text-[10px] sm:text-xs text-[#332f2a] font-sans font-bold uppercase tracking-wider">
          {isAr ? "نشهد أن المتدرب(ة):" : "This is to certify that"}
        </p>

        <h3 className="text-base sm:text-2xl font-extrabold text-[#111111] font-serif my-1">
          ({displayRecipient})
        </h3>

        <p className="text-[10px] sm:text-xs text-[#332f2a] font-serif font-medium leading-relaxed max-w-md mx-auto">
          {certType === "track"
            ? (isAr ? "قد أكمل بنجاح المسار التعليمي المعتمد والموثق بعنوان:" : "Has successfully completed the verified learning track entitled")
            : certType === "achievement"
              ? (isAr ? "قد اجتاز بنجاح الورشة التدريبية والاختبار التقييمي المعتمد لـ:" : "Has successfully completed and passed the exam for")
              : (isAr ? "قد شارك بنجاح في الورشة التدريبية بعنوان:" : "Has successfully participated in the training webinar entitled")}
        </p>

        <h4 className="text-xs sm:text-base font-extrabold text-[#000000] font-serif max-w-lg mx-auto leading-normal px-2">
          " {displayWorkshop} "
        </h4>

        <p className="text-xs sm:text-sm font-extrabold text-[#1a1816] font-sans tracking-wide mt-2">
          {formattedDate}
        </p>
      </div>

      {/* Footer Signatures & Central Scalloped Stamp */}
      {!hasCustomImage ? (
        <div className="grid grid-cols-3 gap-2 sm:gap-6 items-end text-center z-10 pb-1 sm:pb-3 px-4 sm:px-12">
          {/* Left Signature: CEO */}
          <div className="space-y-1">
            <div className="h-10 flex items-center justify-center">
              <svg viewBox="0 0 120 45" className="w-24 sm:w-28 h-10 text-[#1a1816]">
                <path d="M 10,35 Q 35,30 75,36 T 110,30" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M 15,28 C 30,22 38,12 48,10 C 60,8 65,15 58,22 C 50,30 40,32 36,28 C 30,22 48,12 70,20 C 88,26 95,14 90,9 C 85,4 80,9 82,18 C 85,30 102,22 98,28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
                <rect x="32" y="24" width="36" height="6.5" rx="3.25" fill="white" />
                <rect x="32" y="35" width="36" height="6.5" rx="3.25" fill="white" />
                <rect x="32" y="46" width="36" height="6.5" rx="3.25" fill="white" />
                {/* SKILLS text */}
                <text x="50" y="70" textAnchor="middle" fill="white" fontSize="10.5" fontWeight="900" letterSpacing="1.5" fontFamily="sans-serif">SKILLS</text>
              </svg>
            </div>
          </div>

          {/* Right Signature: Trainer */}
          <div className="space-y-1">
            <div className="h-10 flex items-center justify-center">
              <svg viewBox="0 0 120 45" className="w-24 sm:w-28 h-10 text-[#1a1816]">
                <path d="M 10,35 Q 35,30 75,36 T 110,30" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M 15,28 C 30,22 38,12 48,10 C 60,8 65,15 58,22 C 50,30 40,32 36,28 C 30,22 48,12 70,20 C 88,26 95,14 90,9 C 85,4 80,9 82,18 C 85,30 102,22 98,28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
