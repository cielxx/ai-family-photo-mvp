const { serviceList } = require("../../utils/mock-data");

Page({
  data: {
    services: serviceList
  },

  selectService(event) {
    const serviceType = event.currentTarget.dataset.id;

    wx.navigateTo({
      url: `/pages/upload/upload?serviceType=${serviceType}`
    });
  }
});
