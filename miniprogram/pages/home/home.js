const { serviceList } = require("../../utils/mock-data");

Page({
  data: {
    services: [
      serviceList.find((service) => service.id === "black_white_colorization"),
      serviceList.find((service) => service.id === "old_photo_restoration"),
      serviceList.find((service) => service.id === "memorial_portrait")
    ].map((service) => ({
      ...service,
      iconType:
        service.id === "black_white_colorization"
          ? "palette"
          : service.id === "memorial_portrait"
            ? "profile"
            : "magic",
      actionText: service.id === "black_white_colorization" ? "开始上色" : service.id === "memorial_portrait" ? "开始生成" : "开始修复",
      homeImage: service.resultImage,
      homeDescription:
        service.id === "black_white_colorization"
          ? "为黑白照片补上自然色彩"
          : service.id === "memorial_portrait"
            ? "从日常人像生成纪念照片"
            : "改善模糊、褪色、划痕与噪点"
    }))
  },

  startService(event) {
    const serviceType = event.currentTarget.dataset.id;

    wx.navigateTo({
      url: `/pages/upload/upload?serviceType=${serviceType}`
    });
  }
});
