type CommunityConfig = {
  /** Add a current QR image under public, then set its same-origin path here. */
  qrCodeSrc: string | null;
  qrCodeDownloadName: string;
};

export const communityConfig: CommunityConfig = {
  qrCodeSrc: "/images/community/wechat-qrcode",
  qrCodeDownloadName: "GoalNZ-家长社群二维码.webp",
};
