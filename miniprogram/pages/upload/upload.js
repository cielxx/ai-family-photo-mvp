const { getService, createTask } = require("../../utils/mock-data");

Page({
  data: {
    service: {},
    serviceType: "old_photo_restoration",
    imageUrl: "",
    uploadTitle: "",
    uploadGuideLineOne: "",
    uploadGuideLineTwo: "",
    uploadTipLineTwo: "",
    serviceGuideLineOne: "",
    serviceGuideLineTwo: "",
    improveTags: [],
    avoidTags: [],
    selectedOptions: [],
    customRequirement: "",
    requirementCount: 0,
    authorizationConfirmed: false,
    canSubmit: false,
    validationStatus: "idle",
    validationMessage: ""
  },

  onLoad(options) {
    const serviceType = options.serviceType || "old_photo_restoration";
    const service = getService(serviceType);
    this.setData({
      service,
      serviceType,
      uploadTitle: this.getUploadGuide(service).title,
      uploadGuideLineOne: this.getUploadGuide(service).lineOne,
      uploadGuideLineTwo: this.getUploadGuide(service).lineTwo,
      uploadTipLineTwo: this.getUploadGuide(service).tipLineTwo,
      serviceGuideLineOne: this.getServiceGuide(service).lineOne,
      serviceGuideLineTwo: this.getServiceGuide(service).lineTwo,
      improveTags: this.getImproveTags(service).map((name) => ({
        name,
        active: false
      })),
      avoidTags: this.getAvoidTags(service).map((name) => ({
        name,
        active: false
      }))
    });
  },

  getUploadGuide(service) {
    const guides = {
      old_photo_restoration: {
        title: "上传需要修复的照片",
        lineOne: "适合模糊、褪色、有划痕或噪点的老照片",
        lineTwo: "会尽量保留人物特征和年代感",
        tipLineTwo: "可存在模糊、褪色、划痕、噪点"
      },
      black_white_colorization: {
        title: "上传需要上色的照片",
        lineOne: "适合黑白、灰度或色彩缺失的老照片",
        lineTwo: "会尽量保留原始光影和年代感",
        tipLineTwo: "照片可以是黑白、灰度或轻微褪色"
      },
      memorial_portrait: {
        title: "上传需要生成的照片",
        lineOne: "适合人物主体清晰、表情自然的照片",
        lineTwo: "会生成温暖、正式、适合保存的纪念照",
        tipLineTwo: "建议选择单人或主体明确的人像照片"
      }
    };

    return guides[service.id] || guides.old_photo_restoration;
  },

  getServiceGuide(service) {
    const guides = {
      old_photo_restoration: {
        lineOne: "我们会尽量保留人物特征",
        lineTwo: "只改善清晰度、褪色、划痕与噪点等问题"
      },
      black_white_colorization: {
        lineOne: "我们会尽量保留原始光影",
        lineTwo: "为黑白照片补上自然、克制的色彩"
      },
      memorial_portrait: {
        lineOne: "我们会尽量保留人物气质",
        lineTwo: "生成温暖、正式、适合保存的纪念照"
      }
    };

    return guides[service.id] || guides.old_photo_restoration;
  },

  getImproveTags(service) {
    const tags = {
      old_photo_restoration: ["提高清晰度", "修复划痕", "修复褪色", "减少噪点"],
      black_white_colorization: ["自然肤色", "柔和色彩", "保留光影", "增强面部细节"],
      memorial_portrait: ["温暖氛围", "自然表情", "简洁背景", "提升清晰度"]
    };

    return tags[service.id] || service.tags;
  },

  getAvoidTags(service) {
    const tags = {
      old_photo_restoration: ["保留原始氛围", "不要改变五官", "不要过度美化"],
      black_white_colorization: ["保留年代感", "不要过度鲜艳", "不要改变五官"],
      memorial_portrait: ["保留人物特征", "不要过度美化", "不要改变五官"]
    };

    return tags[service.id] || ["保持自然", "不要过度处理"];
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
      return;
    }

    wx.redirectTo({
      url: "/pages/home/home"
    });
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      success: (result) => {
        const file = result.tempFiles && result.tempFiles[0];
        if (!file) return;

        this.setData({
          imageUrl: file.tempFilePath,
          validationStatus: "pass",
          validationMessage: "照片已通过基础检查，可继续补充处理需求"
        });
        this.updateSubmitState();
      },
      fail: () => {
        wx.showToast({
          title: "暂未选择照片",
          icon: "none"
        });
      }
    });
  },

  changePhoto() {
    if (this.data.validationStatus === "fail" && this.data.serviceType === "memorial_portrait") {
      this.setData({
        imageUrl: this.data.service.beforeImage,
        validationStatus: "pass",
        validationMessage: "照片已通过基础检查，可继续补充处理需求"
      });
      this.updateSubmitState();
      return;
    }

    this.chooseImage();
  },

  useSample() {
    const isInvalidSample = this.data.serviceType === "memorial_portrait";

    this.setData({
      imageUrl: isInvalidSample ? "/assets/mock/validation_failed_group.png" : this.data.service.beforeImage,
      validationStatus: isInvalidSample ? "fail" : "pass",
      validationMessage: isInvalidSample
        ? "多人像不适合纪念照生成"
        : "照片已通过基础检查，可继续补充处理需求"
    });
    this.updateSubmitState();
  },

  toggleTag(event) {
    const tag = event.currentTarget.dataset.tag;
    const selectedOptions = [...this.data.selectedOptions];
    const index = selectedOptions.indexOf(tag);

    if (index >= 0) {
      selectedOptions.splice(index, 1);
    } else {
      selectedOptions.push(tag);
    }

    this.setData({
      selectedOptions,
      improveTags: this.data.improveTags.map((item) => ({
        ...item,
        active: selectedOptions.indexOf(item.name) >= 0
      })),
      avoidTags: this.data.avoidTags.map((item) => ({
        ...item,
        active: selectedOptions.indexOf(item.name) >= 0
      }))
    });
  },

  onRequirementInput(event) {
    const value = event.detail.value;

    this.setData({
      customRequirement: value,
      requirementCount: value.length
    });
  },

  toggleAuthorization() {
    this.setData({
      authorizationConfirmed: !this.data.authorizationConfirmed
    });
    this.updateSubmitState();
  },

  updateSubmitState() {
    this.setData({
      canSubmit: Boolean(
        this.data.imageUrl &&
          this.data.authorizationConfirmed &&
          this.data.validationStatus !== "fail"
      )
    });
  },

  submitTask() {
    if (!this.data.canSubmit) return;

    const task = createTask({
      serviceType: this.data.serviceType,
      originalImageUrl: this.data.imageUrl,
      selectedOptions: this.data.selectedOptions,
      customRequirement: this.data.customRequirement,
      authorizationConfirmed: this.data.authorizationConfirmed
    });

    wx.setStorageSync("currentTask", task);
    wx.redirectTo({
      url: "/pages/processing/processing?mode=initial"
    });
  }
});
