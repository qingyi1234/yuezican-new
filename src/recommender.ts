import {
  conditionNotes,
  fruitPool,
  nutritionPrinciples,
  phaseLabels,
  recipes,
  recoveryBaseActions,
} from "./data";
import type {
  DietRestriction,
  Goal,
  MealPlanDay,
  MedicalHistory,
  Recipe,
  RecommendationResult,
  RecoveryPlanDay,
  RecoveryMetric,
  UserProfile,
} from "./types";

const mealOrder = ["breakfast", "lunch", "dinner", "snack", "soup"] as const;

const restrictionLabels: Record<DietRestriction, string> = {
  noPork: "猪肉",
  noBeefLamb: "牛羊肉",
  vegetarian: "荤食",
  noSeafood: "海鲜",
  noEgg: "鸡蛋",
  noMilk: "奶制品",
  noSoy: "大豆/豆制品",
  noPeanut: "花生/坚果",
};

const goalNotes: Record<Goal, string> = {
  weightControl: "控重：每餐保留优质蛋白和蔬菜，汤撇油，不用节食或断碳。",
  lactation: "出奶：保证主食、蛋白、液体和规律哺乳，低脂汤水可作为补液。",
  iron: "补铁：瘦肉、牛肉、少量肝脏和深绿叶菜轮换，搭配维C水果。",
  calcium: "补钙：奶类、无乳糖奶、豆腐、小鱼虾等按忌口选择。",
  lightTaste: "清淡：盐、酱油和油定量，避免重辣、腌制和高钠汤底。",
  constipationRelief: "便秘改善：熟蔬菜、全谷杂豆、水果和饮水同时增加。",
  woundHealing: "伤口恢复：优先蛋白质、维生素C和铁锌来源，剖宫产避免牵拉动作。",
};

const recipeText = (recipe: Recipe) =>
  [
    recipe.name,
    ...recipe.ingredients,
    ...recipe.seasonings,
    ...recipe.steps,
    ...recipe.replacements,
  ].join(" ");

const getPhase = (day: number) =>
  phaseLabels.find((phase) => day >= phase.min && day <= phase.max)?.label ?? "第29-42天 长期哺乳期过渡";

const isUnsafeForCustomAllergy = (recipe: Recipe, allergies: string[]) => {
  const text = recipeText(recipe);
  return allergies.some((allergy) => allergy.trim() && text.includes(allergy.trim()));
};

const hasAvoidedTag = (recipe: Recipe, profile: UserProfile) => {
  const activeAvoids = [
    ...profile.restrictions,
    ...profile.medicalHistory,
    ...profile.goals,
    profile.deliveryMode,
  ];
  if (profile.feedingMode === "notBreastfeeding") {
    activeAvoids.push("lactation" as Goal);
  }
  return recipe.avoidTags.some((tag) => activeAvoids.includes(tag));
};

const scoreRecipe = (recipe: Recipe, profile: UserProfile) => {
  const activePrefs = [
    ...profile.medicalHistory,
    ...profile.goals,
    ...profile.restrictions,
    profile.deliveryMode,
    profile.feedingMode,
  ];
  let score = recipe.preferTags.filter((tag) => activePrefs.includes(tag)).length * 3;

  if (profile.feedingMode !== "notBreastfeeding" && recipe.nutritionTags.includes("泌乳支持")) score += 2;
  if (profile.medicalHistory.includes("gestationalDiabetes") && recipe.nutritionTags.includes("控糖友好")) score += 8;
  if (profile.medicalHistory.includes("gestationalDiabetes") && recipe.nutritionTags.includes("甜品")) score -= 4;
  if (profile.medicalHistory.includes("hypertension") && recipe.nutritionTags.includes("清淡")) score += 3;
  if (profile.medicalHistory.includes("anemia") && recipe.nutritionTags.some((tag) => tag.includes("铁"))) score += 4;
  if (profile.medicalHistory.includes("constipation") && recipe.nutritionTags.includes("膳食纤维")) score += 4;
  if (profile.medicalHistory.includes("pluggedDuctRisk") && recipe.nutritionTags.includes("低脂")) score += 4;
  if (recipe.nutritionTags.includes("崔玉涛理念")) score += 2;
  if (profile.goals.includes("weightControl") && recipe.nutritionTags.includes("控重")) score += 2;
  if (profile.goals.includes("lightTaste") && recipe.nutritionTags.includes("清淡")) score += 2;
  return score;
};

const pickRecipe = (
  mealType: Recipe["mealType"],
  day: number,
  profile: UserProfile,
  offset: number,
): { recipe: Recipe; avoided: string[] } => {
  const phaseDay = ((day - 1) % 42) + 1;
  const phaseCandidates = recipes.filter(
    (recipe) => recipe.mealType === mealType && phaseDay >= recipe.phaseMin && phaseDay <= recipe.phaseMax,
  );
  const candidates = phaseCandidates.length > 0 ? phaseCandidates : recipes.filter((recipe) => recipe.mealType === mealType);
  if (candidates.length === 0) {
    throw new Error(`No recipes available for meal type: ${mealType}`);
  }
  const preferredDayCandidates = recipes.filter(
    (recipe) => recipe.mealType === mealType && day >= recipe.phaseMin && day <= recipe.phaseMax,
  );
  const avoided: string[] = [];
  const safe = candidates.filter((recipe) => {
    const unsafe = hasAvoidedTag(recipe, profile) || isUnsafeForCustomAllergy(recipe, profile.allergies);
    if (unsafe) avoided.push(recipe.name);
    return !unsafe;
  });
  const preferredSafe = preferredDayCandidates.filter(
    (recipe) => !hasAvoidedTag(recipe, profile) && !isUnsafeForCustomAllergy(recipe, profile.allergies),
  );
  const pool = preferredSafe.length > 0 ? preferredSafe : safe.length > 0 ? safe : candidates;
  const sorted = [...pool].sort((a, b) => scoreRecipe(b, profile) - scoreRecipe(a, profile));
  const index = (day + offset) % sorted.length;
  return { recipe: sorted[index], avoided };
};

const getFruit = (day: number, profile: UserProfile) => {
  let fruit = fruitPool[(day - 1) % fruitPool.length];
  if (profile.medicalHistory.includes("gestationalDiabetes")) {
    const lowSugarFruit = ["苹果100g，随加餐吃，不榨汁。", "蓝莓60g配无糖酸奶或无糖豆乳。", "猕猴桃半个到1个，放在白天加餐。"];
    return lowSugarFruit[(day - 1) % lowSugarFruit.length];
  }
  if (profile.medicalHistory.includes("gestationalDiabetes")) {
    fruit = fruit.replace("香蕉半根到1根", "香蕉半根").replace("150g", "100g");
  }
  if (profile.goals.includes("constipationRelief") || profile.medicalHistory.includes("constipation")) {
    return day % 2 === 0 ? "猕猴桃1个，常温食用，便秘者优先" : "火龙果150g，腹泻者避开";
  }
  return fruit;
};

const getNutritionFocus = (day: number, profile: UserProfile) => {
  const focus = [
    getPhase(day),
    profile.feedingMode === "notBreastfeeding"
      ? "不哺乳版本适当减少汤饮和加餐能量，保持蛋白和蔬菜。"
      : "哺乳版本保留两次加餐和低脂汤水，帮助补液与维持泌乳。",
  ];

  profile.medicalHistory.forEach((history) => focus.push(conditionNotes[history]));
  profile.goals.forEach((goal) => focus.push(goalNotes[goal]));

  if (profile.deliveryMode === "cesarean") {
    focus.push("剖宫产：优先易消化蛋白和维生素C，伤口疼痛或腹胀明显时少量多餐。");
  }

  return [...new Set(focus)].slice(0, 8);
};

const buildMealDay = (day: number, profile: UserProfile) => {
  const picked = mealOrder.map((mealType, index) => pickRecipe(mealType, day, profile, index));
  const [breakfast, lunch, dinner, snack, soup] = picked.map((item) => item.recipe);
  const secondSnack = pickRecipe("snack", day + 3, profile, 2);
  const avoided = picked.flatMap((item) => item.avoided).concat(secondSnack.avoided);

  const ruleNotes = [
    ...profile.restrictions.map((restriction) => `已避开：${restrictionLabels[restriction]}`),
    ...profile.allergies.filter(Boolean).map((allergy) => `已按自填过敏避开：${allergy}`),
  ];

  return {
    dayPlan: {
      day,
      phase: getPhase(day),
      breakfast,
      lunch,
      dinner,
      snacks: [snack, secondSnack.recipe],
      soup,
      fruit: getFruit(day, profile),
      nutritionFocus: getNutritionFocus(day, profile),
      ruleNotes,
    } satisfies MealPlanDay,
    avoided,
  };
};

const buildRecoveryPlan = (day: number, profile: UserProfile): RecoveryPlanDay => {
  const stopSignals = [
    "恶露或出血明显增多",
    "头晕、胸痛、心慌或气短",
    "剖宫产伤口疼痛、红肿或渗液",
    "会阴疼痛加重、盆底下坠感或尿失禁加重",
  ];

  const actions = [recoveryBaseActions.breathing, recoveryBaseActions.pelvicFloor, recoveryBaseActions.anklePump];
  if (day >= 4) actions.push(recoveryBaseActions.shoulderNeck, recoveryBaseActions.pelvicTilt);
  if (day >= 8 && profile.deliveryMode === "vaginal") actions.push(recoveryBaseActions.catCow);
  if (day >= 15) actions.push(recoveryBaseActions.walk);
  if (day >= 29 && profile.activityLevel !== "bedRest") actions.push(recoveryBaseActions.lightStrength);

  if (profile.deliveryMode === "cesarean" && day < 14) {
    return {
      day,
      intensity: "低",
      duration: "10-18分钟，分散完成",
      actions: actions.filter((action) => action.name !== "猫牛式" && action.name !== "坐姿弹力带划船"),
      metrics: getRecoveryMetrics(day, profile),
      stopSignals,
    };
  }

  return {
    day,
    intensity: day < 15 ? "低" : day < 29 ? "低到中" : "中",
    duration: day < 15 ? "12-20分钟" : day < 29 ? "20-35分钟" : "30-45分钟",
    actions,
    metrics: getRecoveryMetrics(day, profile),
    stopSignals,
  };
};

const getRecoveryMetrics = (day: number, profile: UserProfile): RecoveryMetric[] => {
  const isCesareanEarly = profile.deliveryMode === "cesarean" && day < 14;
  const isBedRest = profile.activityLevel === "bedRest";
  const walkTarget =
    day < 4
      ? "床边或室内1-3分钟"
      : day < 8
        ? "5-8分钟"
        : day < 15
          ? isCesareanEarly
            ? "5-10分钟"
            : "10-15分钟"
          : day < 29
            ? isBedRest
              ? "8-12分钟"
              : "15-25分钟"
            : isBedRest
              ? "10-15分钟"
              : "25-35分钟";

  const kegelHold = day < 8 ? "收缩2-3秒，放松4-6秒" : day < 29 ? "收缩4-5秒，放松5秒" : "收缩5-8秒，完全放松";
  const breathing = day < 8 ? "5分钟" : "5-8分钟";
  const mobility =
    day < 4
      ? "踝泵20次/侧"
      : day < 15
        ? "肩颈6分钟 + 骨盆前后倾10次"
        : day < 29
          ? "肩颈6分钟 + 骨盆前后倾2组"
          : "肩颈6分钟 + 骨盆前后倾2组 + 轻阻力2组";

  return [
    {
      label: "腹式呼吸",
      target: breathing,
      frequency: "每天2次",
      note: "不憋气，不用力收腹，剖宫产以伤口无牵拉为准。",
    },
    {
      label: "盆底肌",
      target: `${kegelHold}，8-10次/组`,
      frequency: day < 15 ? "每天2组" : "每天3组",
      note: "每次收缩后必须完全放松，疼痛或下坠感加重时暂停。",
    },
    {
      label: "步行",
      target: walkTarget,
      frequency: day < 15 ? "每天1-2次" : "每天2次，可分段",
      note: "以能完整说话为强度；出血增多、头晕或胸痛立即停止。",
    },
    {
      label: "关节活动",
      target: mobility,
      frequency: "每天1次",
      note: "第29天后恢复良好再加入轻阻力；剖宫产避免卷腹和平板支撑。",
    },
    {
      label: "主观强度",
      target: day < 15 ? "RPE 1-2/10" : day < 29 ? "RPE 2-3/10" : "RPE 3-4/10",
      frequency: "每次运动后记录",
      note: "第二天明显疲劳、疼痛或漏尿加重，下一次减少30%-50%。",
    },
  ];
};

const getRiskWarnings = (profile: UserProfile) => {
  const warnings = [
    "本结果是营养教育和家庭执行参考，不能替代医生、注册营养师或产后康复治疗师。",
  ];

  if (profile.deliveryMode === "cesarean") {
    warnings.push("剖宫产早期避免卷腹、平板支撑、跳跃、大重量训练和明显牵拉伤口的动作。");
  }
  if (profile.medicalHistory.includes("gestationalDiabetes")) {
    warnings.push("妊娠糖尿病或产后血糖异常需复查血糖，水果、主食和汤饮按医生建议调整。");
  }
  if (profile.medicalHistory.includes("hypertension")) {
    warnings.push("高血压、明显水肿、头痛或视物模糊时需要及时就医，饮食不替代降压管理。");
  }
  if (profile.medicalHistory.includes("thyroid")) {
    warnings.push("甲状腺疾病需按复查结果控制碘摄入，海带、紫菜等不作为默认补充。");
  }
  if (profile.allergies.length > 0) {
    warnings.push("自填过敏词会做文本避开；严重过敏者仍需人工复核所有食材和调味。");
  }

  return warnings;
};

const getConditionGuides = (profile: UserProfile) => {
  const guides: string[] = [];

  if (profile.medicalHistory.includes("gestationalDiabetes")) {
    guides.push("血糖管理餐：优先全谷杂豆、低GI主食、足量蔬菜和优质蛋白；甜品只保留无加糖、小份量版本，水果放在加餐并避免果汁。");
    guides.push("每餐主食不取消，但会控制精制米面和南瓜、土豆、红薯等淀粉食材叠加；若医生给了碳水克数，以医嘱为准。");
  }
  if (profile.medicalHistory.includes("hypertension")) {
    guides.push("高血压/水肿餐：汤水撇油少盐，避免腌菜、火腿、浓汤、重口酱料；每天观察头痛、眼花、明显水肿等信号。");
  }
  if (profile.medicalHistory.includes("anemia")) {
    guides.push("贫血餐：瘦红肉、禽肉、鱼、蛋、深绿叶菜轮换，搭配橙子、猕猴桃等维生素C来源帮助铁吸收。");
  }
  if (profile.medicalHistory.includes("constipation")) {
    guides.push("便秘餐：熟蔬菜、全谷杂豆、适量水果和饮水同时增加，避免只喝汤不吃菜或长期细软精米面。");
  }
  if (profile.medicalHistory.includes("pluggedDuctRisk")) {
    guides.push("堵奶风险：不使用油腻浓汤猛催奶，重点放在规律排乳、补水、低脂优质蛋白和休息。");
  }
  if (profile.medicalHistory.includes("lactoseIntolerance")) {
    guides.push("乳糖不耐：奶类优先换成无乳糖奶、无糖酸奶或强化钙豆制品，出现腹胀腹泻时减少单次摄入量。");
  }

  if (guides.length === 0) {
    guides.push("当前按普通产后42天恢复餐执行：不过度进补，不油腻催奶，三餐两加餐保持食物多样。");
  }

  guides.push("崔玉涛健康教育风格参考：强调均衡、清淡、循证和家庭可执行，不照搬任何课程或书籍原文食谱。");
  return guides.slice(0, 6);
};

export const buildRecommendation = (profile: UserProfile): RecommendationResult => {
  const built = Array.from({ length: 42 }, (_, index) => buildMealDay(index + 1, profile));
  const selectedDayNumber = Math.min(Math.max(profile.postpartumDay, 1), 42);
  const days = built.map((item) => item.dayPlan);
  const replacedOrAvoided = [...new Set(built.flatMap((item) => item.avoided))].slice(0, 20);

  return {
    days,
    selectedDay: days[selectedDayNumber - 1],
    selectedRecovery: buildRecoveryPlan(selectedDayNumber, profile),
    replacedOrAvoided,
    riskWarnings: getRiskWarnings(profile),
    conditionGuides: getConditionGuides(profile),
    nutritionPrinciples,
    recoverySummary: [
      "产后42天内以循序渐进为原则，动作后不应出现疼痛、出血增加或明显疲劳。",
      "盆底肌和呼吸训练可早期开始，但强度要轻；剖宫产先保护伤口。",
      "恢复良好者逐步增加散步时间，后期再加入轻阻力训练。",
    ],
  };
};

export const getDefaultProfile = (): UserProfile => ({
  postpartumDay: 1,
  deliveryMode: "vaginal",
  feedingMode: "breastfeeding",
  heightCm: 165,
  currentWeightKg: 62,
  prePregnancyWeightKg: 56,
  activityLevel: "light",
  allergies: [],
  restrictions: [],
  medicalHistory: [],
  goals: ["lactation", "weightControl", "lightTaste"],
});
