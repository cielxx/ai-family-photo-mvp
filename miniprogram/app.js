App({
  onLaunch() {
    if (!wx.cloud) {
      return;
    }

    wx.cloud.init({
      env: "cloud1-d4gsnv5m1657efc08",
      traceUser: true
    });
  },

  globalData: {
    currentTask: null,
    cloudEnv: "cloud1-d4gsnv5m1657efc08"
  }
});
