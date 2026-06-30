const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const taskId = asText(event.taskId);
  const now = new Date();

  if (!taskId) {
    throw new Error("缺少 taskId");
  }

  const resultType = asText(event.resultType || "initial");

  await db.collection("tasks").doc(taskId).update({
    data: {
      status: "saved",
      savedAt: db.serverDate(),
      savedResultType: resultType,
      savedBy: wxContext.OPENID,
      updatedAt: db.serverDate()
    }
  });

  return {
    taskId,
    status: "saved",
    savedAt: now.toISOString(),
    savedResultType: resultType
  };
};

function asText(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}
