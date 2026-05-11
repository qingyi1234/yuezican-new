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
  NutritionScenario,
  Recipe,
  RecommendationResult,
  RecoveryPlanDay,
  RecoveryMetric,
  UserProfile,
} from "./types";

const mealOrder = ["breakfast", "lunch", "dinner", "snack", "soup"] as const;

export const scenarioPlanConfig: Record<NutritionScenario, { length: number; title: string }> = {
  pregnancy: { length: 7, title: "7天孕期营养餐方案" },
  postpartum: { length: 42, title: "42天月子餐方案" },
  lactation: { length: 7, title: "7天泌乳期营养餐方案" },
  senior: { length: 7, title: "7天中老年营养餐方案" },
  babyFood: { length: 7, title: "7天宝宝辅食餐方案" },
};

export const getPlanLength = (scenario: NutritionScenario) => scenarioPlanConfig[scenario].length;
export const getPlanTitle = (scenario: NutritionScenario) => scenarioPlanConfig[scenario].title;

const scenarioSpecificTags = [
  "孕期友好",
  "中老年友好",
  "宝宝辅食",
  "泌乳期友好",
] as const;

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
  bloodSugarStable: "稳定血糖：主食不断碳但定量分配，搭配蛋白和蔬菜，避免果汁、甜汤和精制点心。",
  lowSaltLowFat: "低盐低脂：减少肥肉、油炸、浓汤和高钠调味，优先蒸、煮、炖、拌。",
  proteinMuscle: "维持肌肉：每餐安排优质蛋白，咀嚼困难时做成肉末、鱼泥、蛋羹或豆腐。",
  boneHealth: "骨骼健康：奶豆类、豆腐、小鱼虾和深绿叶菜轮换，必要补充遵医嘱。",
  softEasyDigest: "软烂易消化：食物做细碎湿润，少油少刺激，腹胀时减少杂豆和过多粗纤维。",
  bowelRegular: "规律排便：熟蔬菜、全谷杂豆、适量水果、饮水和轻活动一起安排。",
};

const scenarioFocus: Record<NutritionScenario, string> = {
  pregnancy: "孕期按产检风险、孕周阶段和体重增长目标调整，强调铁、钙、叶酸、优质蛋白和食品安全。",
  postpartum: "月子餐以42天阶段恢复为主，兼顾泌乳、控重、伤口和胃肠耐受。",
  lactation: "泌乳期强调足量能量、补液、优质蛋白、奶豆类和规律哺乳。",
  senior: "中老年营养餐以低盐低脂、软烂易消化、控糖友好和钙蛋白补充为重点。",
  babyFood: "宝宝辅食餐以满6月龄后循序添加为前提，强调高铁、细软、不加盐糖蜂蜜和过敏观察。",
};

const recipeText = (recipe: Recipe) =>
  [
    recipe.name,
    ...recipe.ingredients,
    ...recipe.seasonings,
    ...recipe.steps,
    ...recipe.replacements,
  ].join(" ");

const getPhase = (day: number, scenario: NutritionScenario) => {
  if (scenario === "postpartum") {
    return phaseLabels.find((phase) => day >= phase.min && day <= phase.max)?.label ?? "第29-42天 长期哺乳期过渡";
  }
  const phaseByScenario: Record<Exclude<NutritionScenario, "postpartum">, string> = {
    pregnancy: "孕期7日营养轮换",
    lactation: "泌乳期7日营养轮换",
    senior: "中老年7日营养轮换",
    babyFood: "宝宝辅食7日尝试计划",
  };
  return phaseByScenario[scenario];
};

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

const matchesScenario = (recipe: Recipe, profile: UserProfile) => {
  if (profile.scenario === "pregnancy") return recipe.nutritionTags.includes("孕期友好");
  if (profile.scenario === "senior") return recipe.nutritionTags.includes("中老年友好");
  if (profile.scenario === "babyFood") return recipe.nutritionTags.includes("宝宝辅食");
  if (profile.scenario === "lactation") {
    return recipe.nutritionTags.includes("泌乳期友好") || recipe.nutritionTags.includes("泌乳支持");
  }

  return !recipe.nutritionTags.some((tag) => scenarioSpecificTags.includes(tag as (typeof scenarioSpecificTags)[number]));
};

const scoreRecipe = (recipe: Recipe, profile: UserProfile) => {
  const activePrefs = [
    ...profile.medicalHistory,
    ...profile.goals,
    ...profile.restrictions,
    profile.deliveryMode,
    profile.feedingMode,
    profile.scenario,
  ];
  let score = recipe.preferTags.filter((tag) => activePrefs.includes(tag)).length * 3;

  if (profile.feedingMode !== "notBreastfeeding" && recipe.nutritionTags.includes("泌乳支持")) score += 2;
  if (profile.scenario === "pregnancy" && recipe.nutritionTags.includes("孕期友好")) score += 8;
  if (profile.scenario === "lactation" && recipe.nutritionTags.includes("泌乳期友好")) score += 8;
  if (profile.scenario === "senior" && recipe.nutritionTags.includes("中老年友好")) score += 8;
  if (profile.scenario === "babyFood" && recipe.nutritionTags.includes("宝宝辅食")) score += 12;
  const needsBloodSugar = profile.medicalHistory.some((item) => item === "gestationalDiabetes" || item === "diabetes") || profile.goals.includes("bloodSugarStable");
  if (needsBloodSugar && recipe.nutritionTags.includes("控糖友好")) score += 8;
  if (needsBloodSugar && recipe.nutritionTags.includes("甜品")) score -= 4;
  if ((profile.medicalHistory.includes("hypertension") || profile.goals.includes("lowSaltLowFat")) && recipe.nutritionTags.includes("清淡")) score += 3;
  if ((profile.medicalHistory.includes("hyperlipidemia") || profile.goals.includes("lowSaltLowFat")) && recipe.nutritionTags.includes("低脂")) score += 4;
  if ((profile.medicalHistory.includes("dysphagia") || profile.goals.includes("softEasyDigest")) && recipe.nutritionTags.includes("易消化")) score += 5;
  if ((profile.medicalHistory.includes("osteoporosis") || profile.goals.includes("boneHealth")) && recipe.nutritionTags.includes("钙")) score += 5;
  if (profile.goals.includes("proteinMuscle") && recipe.nutritionTags.includes("优质蛋白")) score += 4;
  if (profile.medicalHistory.includes("anemia") && recipe.nutritionTags.some((tag) => tag.includes("铁"))) score += 4;
  if ((profile.medicalHistory.includes("constipation") || profile.goals.includes("bowelRegular")) && recipe.nutritionTags.includes("膳食纤维")) score += 4;
  if (profile.medicalHistory.includes("pluggedDuctRisk") && recipe.nutritionTags.includes("低脂")) score += 4;
  if (recipe.nutritionTags.includes("崔玉涛理念")) score += 2;
  if (recipe.mealType === "breakfast" && recipe.nutritionTags.includes("早餐优化")) score += 4;
  if (recipe.mealType === "snack" && recipe.nutritionTags.includes("加餐优化")) score += 4;
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
  const phaseDay = ((day - 1) % getPlanLength(profile.scenario)) + 1;
  const phaseCandidates = recipes.filter(
    (recipe) =>
      recipe.mealType === mealType &&
      matchesScenario(recipe, profile) &&
      phaseDay >= recipe.phaseMin &&
      phaseDay <= recipe.phaseMax,
  );
  const scenarioCandidates = recipes.filter((recipe) => recipe.mealType === mealType && matchesScenario(recipe, profile));
  const candidates = phaseCandidates.length > 0 ? phaseCandidates : scenarioCandidates;
  if (candidates.length === 0) {
    throw new Error(`No recipes available for meal type ${mealType} in scenario ${profile.scenario}`);
  }
  const preferredDayCandidates = recipes.filter(
    (recipe) => recipe.mealType === mealType && matchesScenario(recipe, profile) && day >= recipe.phaseMin && day <= recipe.phaseMax,
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
  if (profile.scenario === "pregnancy") {
    const pregnancyFruit = [
      "橙子150g，常温食用，搭配含铁餐。",
      "草莓120g，洗净后尽快食用，不加糖。",
      "苹果150g，常温或蒸温食用。",
    ];
    return pregnancyFruit[(day - 1) % pregnancyFruit.length];
  }
  if (profile.scenario === "senior") {
    const seniorFruit = [
      "苹果100g，切小块或蒸温，咀嚼困难者做软烂处理。",
      "猕猴桃半个到1个，便秘者可选。",
      "梨100g，蒸温后食用，不加冰糖。",
    ];
    return seniorFruit[(day - 1) % seniorFruit.length];
  }
  if (profile.scenario === "babyFood") {
    const babyFruit = [
      "苹果泥或梨泥30-50g，单一水果少量尝试，不加糖。",
      "香蕉泥20-30g，便秘时可少量尝试，腹泻时暂停。",
      "牛油果泥20g，可与高铁米粉混合，首次少量观察。",
    ];
    return babyFruit[(day - 1) % babyFruit.length];
  }
  if (profile.medicalHistory.includes("gestationalDiabetes") || profile.medicalHistory.includes("diabetes") || profile.goals.includes("bloodSugarStable")) {
    const lowSugarFruit = [
      "苹果100g，随加餐吃，不榨汁。",
      "蓝莓60g配无糖酸奶或无糖豆乳。",
      "猕猴桃半个到1个，放在白天加餐。",
      "草莓100g，清洗后常温食用，不加糖。",
      "柚子80-100g，随正餐吃，服药者先问医生。",
    ];
    return lowSugarFruit[(day - 1) % lowSugarFruit.length];
  }
  if (profile.medicalHistory.includes("anemia") || profile.goals.includes("iron")) {
    const ironFruit = [
      "橙子150g，常温食用，帮助铁吸收。",
      "猕猴桃1个，放在午后加餐。",
      "草莓120g，清洗后常温食用。",
    ];
    return ironFruit[(day - 1) % ironFruit.length];
  }
  if (profile.goals.includes("constipationRelief") || profile.goals.includes("bowelRegular") || profile.medicalHistory.includes("constipation")) {
    const constipationFruit = [
      "猕猴桃1个，常温食用，便秘者优先。",
      "火龙果150g，腹泻者避开。",
      "苹果梨混合120g，蒸温后食用，不加糖。",
    ];
    return constipationFruit[(day - 1) % constipationFruit.length];
  }
  if (profile.deliveryMode === "cesarean" && day <= 7) {
    return "苹果100-150g，蒸温后小份量吃，腹胀明显时暂缓。";
  }
  return fruit;
};

const getNutritionFocus = (day: number, profile: UserProfile) => {
  const focus = [
    getPhase(day, profile.scenario),
    `服务类型：${scenarioFocus[profile.scenario]}`,
  ];

  if (profile.scenario === "postpartum" || profile.scenario === "lactation") {
    focus.push(
      profile.feedingMode === "notBreastfeeding"
        ? "不哺乳版本适当减少汤饮和加餐能量，保持蛋白和蔬菜。"
        : "哺乳版本保留两次加餐和低脂汤水，帮助补液与维持泌乳。",
    );
  }

  profile.medicalHistory.forEach((history) => focus.push(conditionNotes[history]));
  profile.goals.forEach((goal) => focus.push(goalNotes[goal]));

  if (profile.scenario === "postpartum" && profile.deliveryMode === "cesarean") {
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
      phase: getPhase(day, profile.scenario),
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

  if (profile.scenario === "pregnancy") {
    warnings.push("孕期如有妊娠糖尿病、高血压、贫血、胎儿生长受限等情况，需以产检医生和营养师建议为准。");
  }
  if (profile.scenario === "senior") {
    warnings.push("中老年人如有肾病、吞咽障碍、糖尿病、高血压或用药限制，需按医生和营养师建议调整蛋白、钠和钾摄入。");
  }
  if (profile.scenario === "babyFood") {
    warnings.push("辅食餐仅适用于通常满6月龄且具备添加辅食信号的宝宝；早产、过敏、吞咽问题或生长发育异常需先咨询儿保医生。");
  }
  if (profile.scenario === "postpartum" && profile.deliveryMode === "cesarean") {
    warnings.push("剖宫产早期避免卷腹、平板支撑、跳跃、大重量训练和明显牵拉伤口的动作。");
  }
  if (profile.medicalHistory.includes("gestationalDiabetes")) {
    warnings.push("妊娠糖尿病或产后血糖异常需复查血糖，水果、主食和汤饮按医生建议调整。");
  }
  if (profile.medicalHistory.includes("diabetes")) {
    warnings.push("糖尿病或血糖偏高需结合血糖监测、用药和医生建议调整主食、水果和加餐。");
  }
  if (profile.medicalHistory.includes("kidneyDisease")) {
    warnings.push("肾功能异常人群的蛋白、钠、钾、磷摄入必须个体化，建议先咨询医生或注册营养师。");
  }
  if (profile.medicalHistory.includes("dysphagia")) {
    warnings.push("咀嚼或吞咽困难、进食呛咳、反复肺炎风险者，需要先做吞咽评估，不建议自行按普通餐执行。");
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

  if (profile.scenario === "pregnancy") {
    guides.push("孕期营养餐：按阶段强调叶酸、铁、钙、优质蛋白和低汞鱼类；避免生食、酒精、未消毒奶制品和高汞鱼。");
  }
  if (profile.scenario === "lactation") {
    guides.push("泌乳期营养餐：以足量能量、优质蛋白、奶豆类、补液和规律哺乳为核心，不依赖油腻浓汤催乳。");
  }
  if (profile.scenario === "senior") {
    guides.push("中老年营养餐：低盐低脂、软烂易消化，重视优质蛋白、钙、膳食纤维和慢病用药限制。");
  }
  if (profile.scenario === "babyFood") {
    guides.push("宝宝辅食餐：从高铁米粉、肉泥、菜泥逐步过渡到软烂颗粒；每次新增一种食材，连续观察2-3天。");
    guides.push("辅食卫生：现做现吃，不加盐糖蜂蜜，不使用成人汤底，鱼刺和骨渣必须完全剔除。");
  }

  if (profile.medicalHistory.includes("gestationalDiabetes") || profile.medicalHistory.includes("diabetes")) {
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
  if (profile.medicalHistory.includes("hyperlipidemia")) {
    guides.push("血脂管理餐：少油炸、肥肉、奶油点心和浓汤，优先低脂奶、豆制品、鱼禽肉和高纤维蔬菜。");
  }
  if (profile.medicalHistory.includes("goutHighUricAcid")) {
    guides.push("高尿酸/痛风餐：避开酒精、浓肉汤、动物内脏和大量高嘌呤海鲜，肉类不过量并保证饮水。");
  }
  if (profile.medicalHistory.includes("kidneyDisease")) {
    guides.push("肾功能异常餐：本工具只保留低盐和食品安全提醒，蛋白、钾、磷和液体量需要按化验结果个体化。");
  }
  if (profile.medicalHistory.includes("osteoporosis") || profile.goals.includes("boneHealth")) {
    guides.push("骨骼健康餐：奶豆、豆腐、低汞鱼虾和深绿叶菜轮换，配合安全日晒和适量抗阻活动。");
  }
  if (profile.medicalHistory.includes("dysphagia") || profile.goals.includes("softEasyDigest")) {
    guides.push("咀嚼/吞咽友好餐：食物做软烂、细碎、湿润，避免干硬散碎和带刺带骨食物。");
  }

  if (guides.length === 0) {
    guides.push("当前按所选服务类型生成基础营养餐：不过度进补，不油腻催奶，三餐两加餐保持食物多样。");
  }

  guides.push("崔玉涛健康教育风格参考：强调均衡、清淡、循证和家庭可执行，不照搬任何课程或书籍原文食谱。");
  return guides.slice(0, 6);
};

export const buildRecommendation = (profile: UserProfile): RecommendationResult => {
  const planLength = getPlanLength(profile.scenario);
  const built = Array.from({ length: planLength }, (_, index) => buildMealDay(index + 1, profile));
  const selectedDayNumber = Math.min(Math.max(profile.postpartumDay, 1), planLength);
  const days = built.map((item) => item.dayPlan);
  const replacedOrAvoided = [...new Set(built.flatMap((item) => item.avoided))].slice(0, 20);

  return {
    planLength,
    planTitle: getPlanTitle(profile.scenario),
    days,
    selectedDay: days[selectedDayNumber - 1],
    selectedRecovery: buildRecoveryPlan(selectedDayNumber, profile),
    replacedOrAvoided,
    riskWarnings: getRiskWarnings(profile),
    conditionGuides: getConditionGuides(profile),
    nutritionPrinciples,
    recoverySummary: [
      profile.scenario === "postpartum"
        ? "产后42天内以循序渐进为原则，动作后不应出现疼痛、出血增加或明显疲劳。"
        : "活动建议以低强度、可持续和第二天不疲劳为原则，特殊人群先遵医嘱。",
      profile.scenario === "postpartum"
        ? "盆底肌和呼吸训练可早期开始，但强度要轻；剖宫产先保护伤口。"
        : "孕期、中老年或宝宝辅食方案的运动与照护建议仅做家庭教育参考。",
      "恢复良好者逐步增加散步时间，后期再加入轻阻力训练。",
    ],
  };
};

export const getDefaultProfile = (): UserProfile => ({
  scenario: "postpartum",
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
