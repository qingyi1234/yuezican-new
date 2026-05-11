import { useEffect, useMemo, useState } from "react";
import { defaultProfileOptions, recipes } from "./data";
import { buildRecommendation, getDefaultProfile } from "./recommender";
import type {
  ActivityLevel,
  DeliveryMode,
  DietRestriction,
  FeedingMode,
  Goal,
  MedicalHistory,
  NutritionScenario,
  Recipe,
  UserProfile,
} from "./types";

const deliveryLabels: Record<DeliveryMode, string> = {
  vaginal: "顺产",
  cesarean: "剖宫产",
};

const feedingLabels: Record<FeedingMode, string> = {
  breastfeeding: "母乳喂养",
  mixed: "混合喂养",
  notBreastfeeding: "不哺乳",
};

const activityLabels: Record<ActivityLevel, string> = {
  bedRest: "多卧床",
  light: "轻活动",
  normal: "恢复较好",
};

const scenarioLabels: Record<NutritionScenario, string> = {
  pregnancy: "孕期营养餐",
  postpartum: "月子餐",
  lactation: "泌乳期营养餐",
  hospitalDelivery: "医院分娩餐",
  postSurgery: "术后养护营养餐",
  senior: "中老年营养餐",
};

const scenarioDescriptions: Record<NutritionScenario, string> = {
  pregnancy: "按孕早、中、晚期分阶段搭配，温和滋养母婴健康。",
  postpartum: "排调补养四阶段膳食方案，清淡适口，助力产后日常食补。",
  lactation: "适配泌乳期饮食需求，强调补液、蛋白和规律哺乳。",
  hospitalDelivery: "适合住院分娩和刚出院阶段，清淡易消化。",
  postSurgery: "适合术后养护阶段，辅助日常营养补充和组织修复。",
  senior: "适配中老年体质，低盐低脂、软烂易消化。",
};

type PageMode = "setup" | "plan" | "library" | "special";
type SpecialTopic = "vaginal" | "cesarean" | "diabetes" | "anemia";
type SavedPlan = {
  id: string;
  name: string;
  createdAt: string;
  profile: UserProfile;
};

const savedPlanKey = "yuezican_saved_plans_v1";

const mealTypeLabels: Record<Recipe["mealType"], string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "加餐/甜品",
  soup: "汤饮",
};

const specialTopics: Array<{
  id: SpecialTopic;
  title: string;
  subtitle: string;
  food: string[];
  recovery: string[];
  avoid: string[];
}> = [
  {
    id: "vaginal",
    title: "顺产专项",
    subtitle: "重点是补液、补铁、盆底恢复和循序渐进活动。",
    food: ["第1-3天以软粥、蒸蛋、鸡丝汤面为主，减少油腻。", "第4天后增加鱼、禽肉、豆腐和深绿叶菜。", "便秘者增加熟蔬菜、猕猴桃、火龙果和全谷杂豆。"],
    recovery: ["早期做腹式呼吸、踝泵、温和盆底肌。", "会阴疼痛加重或下坠明显时暂停盆底收缩，优先放松。", "第8天后恢复好再加入猫牛式和短距离散步。"],
    avoid: ["不急着卷腹、跳跃或高强度塑形。", "不靠红糖水、酒酿或大量甜品恢复体力。"],
  },
  {
    id: "cesarean",
    title: "剖宫产专项",
    subtitle: "重点是伤口保护、少量多餐、优质蛋白和轻活动。",
    food: ["前2周优先清淡易消化：莲藕鸡丝粥、萝卜鸡丝清汤、豆腐蒸杯。", "腹胀明显时减少豆类、粗杂粮和一次性大量水果。", "每天保留蛋白质来源，帮助伤口恢复，不用油腻浓汤。"],
    recovery: ["前14天避免牵拉伤口动作，以呼吸、踝泵、肩颈放松为主。", "翻身、起身时先侧身再用手臂支撑。", "伤口疼痛、红肿、渗液或出血增加时停止训练并就医。"],
    avoid: ["早期避免卷腹、平板支撑、跳跃和大重量。", "不自行使用来源不明药膳或活血类酒饮。"],
  },
  {
    id: "diabetes",
    title: "控糖专项",
    subtitle: "面向妊娠糖尿病或产后血糖管理，强调主食分配和低糖加餐。",
    food: ["主食分到三餐两加餐，不断碳，也不把南瓜、土豆、红薯和米饭叠加过量。", "优先控糖蔬菜蛋燕麦杯、鸡胸藜麦彩蔬碗、蓝莓酸奶小甜品。", "水果选苹果、蓝莓、草莓、猕猴桃小份量，不喝果汁。"],
    recovery: ["餐后身体允许时轻松散步5-15分钟，有助于血糖波动管理。", "运动强度以能完整说话为准。", "血糖异常、头晕心慌时先按医生建议处理。"],
    avoid: ["避免甜汤、果汁、红糖水、酒酿、奶茶和大量精制点心。", "不要用极端节食换体重下降。"],
  },
  {
    id: "anemia",
    title: "贫血专项",
    subtitle: "重点是血红素铁、维生素C搭配和食品安全。",
    food: ["瘦牛肉、瘦肉、禽肉、鱼、蛋和深绿叶菜轮换。", "动物肝脏可少量、低频，必须彻底煮熟。", "橙子、猕猴桃、草莓等维生素C水果安排在含铁餐后或加餐。"],
    recovery: ["头晕、心慌、明显乏力时降低活动量。", "先保证睡眠、补液和轻活动，不强行增加训练。", "贫血明显者按医嘱复查和补铁。"],
    avoid: ["不要用浓茶、咖啡搭配补铁餐。", "不吃半熟蛋、生鱼片或未彻底加热的动物肝脏。"],
  },
];

function toggleList<T extends string>(list: T[], value: T) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function parseAllergies(value: string) {
  return value
    .split(/[，,、\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function readSavedPlans(): SavedPlan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(savedPlanKey);
    return raw
      ? (JSON.parse(raw) as SavedPlan[]).map((plan) => ({
          ...plan,
          profile: { ...getDefaultProfile(), ...plan.profile, scenario: plan.profile.scenario ?? "postpartum" },
        }))
      : [];
  } catch {
    return [];
  }
}

function writeSavedPlans(plans: SavedPlan[]) {
  window.localStorage.setItem(savedPlanKey, JSON.stringify(plans));
}

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button className={`chip ${active ? "chipActive" : ""}`} type="button" onClick={onClick}>
      {children}
    </button>
  );
}

function HeroVisual() {
  return (
    <div className="heroVisual" aria-hidden="true">
      <div className="motherScene">
        <div className="sunDisc" />
        <div className="motherFigure">
          <span className="motherHead" />
          <span className="motherHair" />
          <span className="motherBody" />
          <span className="babyBundle" />
        </div>
      </div>
      <div className="foodScene">
        <span className="steam steamOne" />
        <span className="steam steamTwo" />
        <span className="bowl" />
        <span className="plate" />
        <span className="leaf leafOne" />
        <span className="leaf leafTwo" />
      </div>
      <div className="moveScene">
        <span className="mat" />
        <span className="poseHead" />
        <span className="poseBody" />
        <span className="poseArm" />
        <span className="poseLeg" />
      </div>
    </div>
  );
}

function MealArt({ mealType }: { mealType: Recipe["mealType"] }) {
  return (
    <div className={`mealArt ${mealType}Art`} aria-hidden="true">
      <span className="mealSteam mealSteamOne" />
      <span className="mealSteam mealSteamTwo" />
      <span className="mealPlate" />
      <span className="mealBowl" />
      <span className="mealLeaf" />
      <span className="mealGrain" />
    </div>
  );
}

function RecipeCard({ title, recipe }: { title: string; recipe: Recipe }) {
  return (
    <article className="recipeCard">
      <div className="recipeHead">
        <div>
          <span className="mealLabel">{title}</span>
          <h3>{recipe.name}</h3>
        </div>
        <MealArt mealType={recipe.mealType} />
      </div>
      <div className="recipeGrid">
        <div>
          <h4>食材</h4>
          <p>{recipe.ingredients.join("；")}</p>
        </div>
        <div>
          <h4>调味</h4>
          <p>{recipe.seasonings.join("；")}</p>
        </div>
      </div>
      <div>
        <h4>做法</h4>
        <ol>
          {recipe.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
      <div className="tagRow">
        {recipe.nutritionTags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <p className="muted">{recipe.replacements.join(" ")}</p>
      <p className="safety">{recipe.safetyNote}</p>
    </article>
  );
}

function RecipeLibrary({ onBack }: { onBack: () => void }) {
  const [search, setSearch] = useState("");
  const [mealFilter, setMealFilter] = useState<Recipe["mealType"] | "all">("all");
  const normalizedSearch = search.trim();
  const filteredRecipes = recipes.filter((recipe) => {
    const matchesMeal = mealFilter === "all" || recipe.mealType === mealFilter;
    const text = [
      recipe.name,
      recipe.mealType,
      ...recipe.ingredients,
      ...recipe.nutritionTags,
      ...recipe.preferTags,
      ...recipe.avoidTags,
    ].join(" ");
    return matchesMeal && (!normalizedSearch || text.includes(normalizedSearch));
  });
  const countByMeal = (Object.keys(mealTypeLabels) as Recipe["mealType"][]).map((mealType) => ({
    mealType,
    count: recipes.filter((recipe) => recipe.mealType === mealType).length,
  }));

  return (
    <main className="libraryPage">
      <section className="libraryHero">
        <div>
          <p className="eyebrow">后台食谱库</p>
          <h1>结构化管理所有月子餐、甜品、水果逻辑和禁忌标签</h1>
          <p>
            第一版是本地食谱库视图，方便你审核菜名、食材、调味、适配人群和风险标签。后面如果要做真正后台，可以直接把这些结构迁到数据库。
          </p>
        </div>
        <button className="ghostButton" type="button" onClick={onBack}>
          返回方案
        </button>
      </section>

      <section className="libraryWorkspace">
        <section className="libraryStats">
          {countByMeal.map((item) => (
            <article key={item.mealType}>
              <span>{mealTypeLabels[item.mealType]}</span>
              <strong>{item.count}</strong>
            </article>
          ))}
        </section>

        <section className="panel libraryTools">
          <label className="field">
            <span>搜索食谱、标签、食材</span>
            <input
              type="text"
              placeholder="例如：控糖、早餐、贫血、豆腐、甜品"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="chipWrap">
            <Chip active={mealFilter === "all"} onClick={() => setMealFilter("all")}>
              全部
            </Chip>
            {(Object.keys(mealTypeLabels) as Recipe["mealType"][]).map((mealType) => (
              <Chip key={mealType} active={mealFilter === mealType} onClick={() => setMealFilter(mealType)}>
                {mealTypeLabels[mealType]}
              </Chip>
            ))}
          </div>
        </section>

        <section className="libraryGrid">
          {filteredRecipes.map((recipe) => (
            <article className="libraryRecipeCard" key={recipe.id}>
              <div className="libraryRecipeTop">
                <span>{mealTypeLabels[recipe.mealType]}</span>
                <small>
                  第{recipe.phaseMin}-{recipe.phaseMax}天
                </small>
              </div>
              <h2>{recipe.name}</h2>
              <p>{recipe.ingredients.join("；")}</p>
              <div className="tagRow">
                {recipe.nutritionTags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              <div className="libraryMeta">
                <p>优先：{recipe.preferTags.length > 0 ? recipe.preferTags.join("、") : "通用"}</p>
                <p>避开：{recipe.avoidTags.length > 0 ? recipe.avoidTags.join("、") : "无特殊禁忌"}</p>
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}

function SpecialPage({
  activeTopic,
  onSelectTopic,
  onApply,
  onBack,
}: {
  activeTopic: SpecialTopic;
  onSelectTopic: (topic: SpecialTopic) => void;
  onApply: (topic: SpecialTopic) => void;
  onBack: () => void;
}) {
  const topic = specialTopics.find((item) => item.id === activeTopic) ?? specialTopics[0];

  return (
    <main className="specialPage">
      <section className="specialHero">
        <div>
          <p className="eyebrow">专项推荐页</p>
          <h1>顺产、剖宫产、控糖、贫血的月子餐重点拆开看</h1>
          <p>专项页用于给用户快速理解“为什么这样推荐”，也可以一键切换到对应人群设置。</p>
        </div>
        <button className="ghostButton" type="button" onClick={onBack}>
          返回方案
        </button>
      </section>
      <section className="specialWorkspace">
        <div className="specialTabs" role="tablist" aria-label="专项推荐类型">
          {specialTopics.map((item) => (
            <button
              key={item.id}
              className={item.id === activeTopic ? "selected" : ""}
              type="button"
              onClick={() => onSelectTopic(item.id)}
            >
              {item.title}
            </button>
          ))}
        </div>
        <section className="panel specialDetail">
          <div className="specialDetailHeader">
            <div>
              <p className="eyebrow">当前专项</p>
              <h2>{topic.title}</h2>
              <p>{topic.subtitle}</p>
            </div>
            <button className="saveButton" type="button" onClick={() => onApply(topic.id)}>
              套用到方案
            </button>
          </div>
          <div className="specialColumns">
            <article>
              <h3>饮食重点</h3>
              <ul>
                {topic.food.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article>
              <h3>康复重点</h3>
              <ul>
                {topic.recovery.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article>
              <h3>需要避开</h3>
              <ul>
                {topic.avoid.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>
      </section>
    </main>
  );
}

function PrintPlan({ result }: { result: ReturnType<typeof buildRecommendation> }) {
  return (
    <section className="printPlan" aria-label="42天打印方案">
      <h1>42天月子餐打印方案</h1>
      <p>内容用于家庭执行参考，不替代医生、注册营养师或产康治疗师建议。</p>
      <table>
        <thead>
          <tr>
            <th>天数</th>
            <th>阶段</th>
            <th>早餐</th>
            <th>午餐</th>
            <th>晚餐</th>
            <th>加餐/水果</th>
            <th>汤饮</th>
          </tr>
        </thead>
        <tbody>
          {result.days.map((day) => (
            <tr key={day.day}>
              <td>第{day.day}天</td>
              <td>{day.phase}</td>
              <td>{day.breakfast.name}</td>
              <td>{day.lunch.name}</td>
              <td>{day.dinner.name}</td>
              <td>
                {day.snacks.map((snack) => snack.name).join("；")}
                <br />
                {day.fruit}
              </td>
              <td>{day.soup.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ProfileForm({
  profile,
  allergyText,
  setAllergyText,
  setProfileField,
  onReset,
  onSubmit,
}: {
  profile: UserProfile;
  allergyText: string;
  setAllergyText: (value: string) => void;
  setProfileField: <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => void;
  onReset: () => void;
  onSubmit: () => void;
}) {
  return (
    <section className="panel formPanel setupForm" aria-label="用户信息问卷">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">第一步</p>
          <h2>用户诉求</h2>
        </div>
        <button className="ghostButton" type="button" onClick={onReset}>
          重置
        </button>
      </div>

      <label className="field">
        <span>{profile.scenario === "postpartum" ? "产后" : "方案"}第 {profile.postpartumDay} 天</span>
        <input
          type="range"
          min="1"
          max="42"
          value={profile.postpartumDay}
          onChange={(event) => setProfileField("postpartumDay", Number(event.target.value))}
        />
      </label>

      <div className="fieldGroup">
        <span>服务类型</span>
        <div className="scenarioCards">
          {defaultProfileOptions.scenarios.map(([value, label]) => (
            <button
              className={`scenarioCard scenario-${value} ${profile.scenario === value ? "selected" : ""}`}
              type="button"
              key={value}
              onClick={() => setProfileField("scenario", value)}
            >
              <span className="scenarioIcon" aria-hidden="true" />
              <strong>{label}</strong>
              <small>{scenarioDescriptions[value]}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="fieldGroup">
        <span>分娩方式</span>
        <div className="segmented">
          {(Object.keys(deliveryLabels) as DeliveryMode[]).map((mode) => (
            <button
              className={profile.deliveryMode === mode ? "selected" : ""}
              type="button"
              key={mode}
              onClick={() => setProfileField("deliveryMode", mode)}
            >
              {deliveryLabels[mode]}
            </button>
          ))}
        </div>
      </div>

      <div className="fieldGroup">
        <span>哺乳状态</span>
        <div className="segmented three">
          {(Object.keys(feedingLabels) as FeedingMode[]).map((mode) => (
            <button
              className={profile.feedingMode === mode ? "selected" : ""}
              type="button"
              key={mode}
              onClick={() => setProfileField("feedingMode", mode)}
            >
              {feedingLabels[mode]}
            </button>
          ))}
        </div>
      </div>

      <div className="inlineFields">
        <label>
          <span>身高 cm</span>
          <input
            type="number"
            value={profile.heightCm}
            onChange={(event) => setProfileField("heightCm", Number(event.target.value))}
          />
        </label>
        <label>
          <span>孕前 kg</span>
          <input
            type="number"
            value={profile.prePregnancyWeightKg}
            onChange={(event) => setProfileField("prePregnancyWeightKg", Number(event.target.value))}
          />
        </label>
        <label>
          <span>当前 kg</span>
          <input
            type="number"
            value={profile.currentWeightKg}
            onChange={(event) => setProfileField("currentWeightKg", Number(event.target.value))}
          />
        </label>
      </div>

      <div className="fieldGroup">
        <span>活动能力</span>
        <div className="segmented three">
          {(Object.keys(activityLabels) as ActivityLevel[]).map((level) => (
            <button
              className={profile.activityLevel === level ? "selected" : ""}
              type="button"
              key={level}
              onClick={() => setProfileField("activityLevel", level)}
            >
              {activityLabels[level]}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span>过敏食物</span>
        <input
          type="text"
          placeholder="例如：虾、花生、牛奶"
          value={allergyText}
          onChange={(event) => {
            setAllergyText(event.target.value);
            setProfileField("allergies", parseAllergies(event.target.value));
          }}
        />
      </label>

      <div className="fieldGroup">
        <span>忌口/限制</span>
        <div className="chipWrap">
          {defaultProfileOptions.restrictions.map(([value, label]) => (
            <Chip
              active={profile.restrictions.includes(value)}
              key={value}
              onClick={() => setProfileField("restrictions", toggleList(profile.restrictions, value))}
            >
              {label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="fieldGroup">
        <span>常见病史</span>
        <div className="chipWrap">
          {defaultProfileOptions.medicalHistory.map(([value, label]) => (
            <Chip
              active={profile.medicalHistory.includes(value)}
              key={value}
              onClick={() => setProfileField("medicalHistory", toggleList(profile.medicalHistory, value))}
            >
              {label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="fieldGroup">
        <span>目标诉求</span>
        <div className="chipWrap">
          {defaultProfileOptions.goals.map(([value, label]) => (
            <Chip
              active={profile.goals.includes(value)}
              key={value}
              onClick={() => setProfileField("goals", toggleList(profile.goals, value))}
            >
              {label}
            </Chip>
          ))}
        </div>
      </div>

      <button className="primaryButton" type="button" onClick={onSubmit}>
        生成42天月子餐方案
      </button>
    </section>
  );
}

function App() {
  const [page, setPage] = useState<PageMode>("setup");
  const [profile, setProfile] = useState<UserProfile>(getDefaultProfile);
  const [allergyText, setAllergyText] = useState("");
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [saveMessage, setSaveMessage] = useState("");
  const [activeSpecialTopic, setActiveSpecialTopic] = useState<SpecialTopic>("cesarean");
  const result = useMemo(() => buildRecommendation(profile), [profile]);
  const selectedDay = result.selectedDay;
  const metricByLabel = new Map(result.selectedRecovery.metrics.map((metric) => [metric.label, metric]));
  const recoveryHighlights = [
    {
      label: "今日总时长",
      value: result.selectedRecovery.duration,
      note: `${result.selectedRecovery.intensity}强度，分段完成更稳妥`,
    },
    {
      label: "步行目标",
      value: metricByLabel.get("步行")?.target ?? "按身体反应调整",
      note: metricByLabel.get("步行")?.frequency ?? "每天分段",
    },
    {
      label: "盆底肌",
      value: metricByLabel.get("盆底肌")?.target ?? "8-10次/组",
      note: metricByLabel.get("盆底肌")?.frequency ?? "每天2-3组",
    },
    {
      label: "主观强度",
      value: metricByLabel.get("主观强度")?.target ?? "RPE 2-4/10",
      note: "运动后无疼痛、无出血增加",
    },
  ];

  const setProfileField = <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  useEffect(() => {
    setSavedPlans(readSavedPlans());
  }, []);

  const persistSavedPlans = (plans: SavedPlan[]) => {
    setSavedPlans(plans);
    writeSavedPlans(plans);
  };

  const resetProfile = () => {
    setProfile(getDefaultProfile());
    setAllergyText("");
    setSaveMessage("");
  };

  const saveCurrentPlan = () => {
    const planName = `${scenarioLabels[profile.scenario]}-第${profile.postpartumDay}天-${deliveryLabels[profile.deliveryMode]}`;
    const nextPlan: SavedPlan = {
      id: `${Date.now()}`,
      name: planName,
      createdAt: new Date().toLocaleString("zh-CN"),
      profile,
    };
    const nextPlans = [nextPlan, ...savedPlans.filter((plan) => plan.name !== planName)].slice(0, 6);
    persistSavedPlans(nextPlans);
    setSaveMessage("已保存当前方案设置，可在首页一键恢复。");
  };

  const loadSavedPlan = (plan: SavedPlan) => {
    setProfile(plan.profile);
    setAllergyText(plan.profile.allergies.join("、"));
    setSaveMessage(`已恢复：${plan.name}`);
    setPage("plan");
  };

  const deleteSavedPlan = (planId: string) => {
    persistSavedPlans(savedPlans.filter((plan) => plan.id !== planId));
    setSaveMessage("已删除保存方案。");
  };

  const printPlan = () => {
    window.print();
  };

  const applySpecialTopic = (topic: SpecialTopic) => {
    setProfile((current) => {
      if (topic === "cesarean") {
        return {
          ...current,
          deliveryMode: "cesarean",
          goals: [...new Set<Goal>([...current.goals, "woundHealing", "lightTaste"])],
        };
      }
      if (topic === "vaginal") {
        return {
          ...current,
          deliveryMode: "vaginal",
          goals: [...new Set<Goal>([...current.goals, "lactation", "constipationRelief"])],
        };
      }
      if (topic === "diabetes") {
        return {
          ...current,
          medicalHistory: [...new Set<MedicalHistory>([...current.medicalHistory, "gestationalDiabetes"])],
          goals: [...new Set<Goal>([...current.goals, "weightControl", "lightTaste"])],
        };
      }
      return {
        ...current,
        medicalHistory: [...new Set<MedicalHistory>([...current.medicalHistory, "anemia"])],
        goals: [...new Set<Goal>([...current.goals, "iron"])],
      };
    });
    setSaveMessage(`已套用${specialTopics.find((item) => item.id === topic)?.title ?? "专项"}设置。`);
    setPage("plan");
  };

  if (page === "library") {
    return <RecipeLibrary onBack={() => setPage("plan")} />;
  }

  if (page === "special") {
    return (
      <SpecialPage
        activeTopic={activeSpecialTopic}
        onSelectTopic={setActiveSpecialTopic}
        onApply={applySpecialTopic}
        onBack={() => setPage("plan")}
      />
    );
  }

  if (page === "setup") {
    return (
      <main>
        <section className="heroBand setupHero">
          <div className="heroInner">
            <div>
              <p className="eyebrow">月子餐个性化推荐</p>
              <h1>专业规则推荐，让42天月子餐更清淡、更稳、更好执行</h1>
              <p className="heroCopy">
                系统会根据产后天数、顺产/剖宫产、哺乳状态、过敏忌口和常见病史做规则推荐。新增血糖管理餐、崔玉涛健康教育风格清淡餐和本地保存方案。
              </p>
            </div>
            <div className="heroShowcase">
              <HeroVisual />
              <div className="heroStats" aria-label="营养原则摘要">
                <strong>填写完成后进入方案页</strong>
                <span>三餐、加餐、汤饮、水果、康复动作一次生成</span>
                <span>可保存当前设置，下次用同一浏览器快速恢复</span>
                <span>手机访问请使用线上网址，或同一Wi-Fi下打开电脑局域网IP，不要输入127.0.0.1</span>
              </div>
            </div>
          </div>
          <div className="heroProofGrid" aria-label="推荐系统特点">
            <article>
              <span>01</span>
              <strong>先排风险，再推荐</strong>
              <p>根据过敏、忌口、分娩方式和常见病史，先避开不适合的食材，再安排三餐、汤饮和加餐。</p>
            </article>
            <article>
              <span>02</span>
              <strong>营养够，不油腻</strong>
              <p>围绕主食、优质蛋白、蔬菜、水果、奶豆和补液做组合，少盐少油，不用浓汤和甜食硬补。</p>
            </article>
            <article>
              <span>03</span>
              <strong>家人也好执行</strong>
              <p>每道菜写清食材克数、调味、做法和替换项，方案可保存、可打印，方便家属照着准备。</p>
            </article>
          </div>
          <div className="visualStrip" aria-label="网站能力">
            <div>
              <span className="stripIcon motherMini" />
              <strong>妈妈恢复</strong>
              <p>顺产、剖宫产与产后阶段分开处理</p>
            </div>
            <div>
              <span className="stripIcon foodMini" />
              <strong>均衡月子餐</strong>
              <p>具体到食材、做法、调味与替换建议</p>
            </div>
            <div>
              <span className="stripIcon moveMini" />
              <strong>康复锻炼</strong>
              <p>呼吸、盆底、散步和轻阻力量化安排</p>
            </div>
          </div>
        </section>

        <section className="setupWorkspace">
          <ProfileForm
            profile={profile}
            allergyText={allergyText}
            setAllergyText={setAllergyText}
            setProfileField={setProfileField}
            onReset={resetProfile}
            onSubmit={() => setPage("plan")}
          />
          <section className="panel savedPlanPanel" aria-label="已保存方案">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">本地保存</p>
                <h2>已保存方案</h2>
              </div>
              <span>{savedPlans.length}/6</span>
            </div>
            {saveMessage && <p className="saveMessage">{saveMessage}</p>}
            {savedPlans.length > 0 ? (
              <div className="savedPlanList">
                {savedPlans.map((plan) => (
                  <article key={plan.id} className="savedPlanItem">
                    <div>
                      <strong>{plan.name}</strong>
                      <p>{plan.createdAt}</p>
                    </div>
                    <div>
                      <button className="ghostButton" type="button" onClick={() => loadSavedPlan(plan)}>
                        恢复
                      </button>
                      <button className="textButton" type="button" onClick={() => deleteSavedPlan(plan.id)}>
                        删除
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">还没有保存的方案。生成方案后点击“保存方案”，下次打开可直接恢复。</p>
            )}
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="planPage">
      <PrintPlan result={result} />
      <section className="planTop">
        <div className="planTopInner">
          <div>
            <p className="eyebrow">推荐结果</p>
            <h1>
              第 {selectedDay.day} 天{scenarioLabels[profile.scenario]}与康复方案
            </h1>
            <p>
              {selectedDay.phase}，当前体重较孕前
              {profile.currentWeightKg - profile.prePregnancyWeightKg >= 0 ? "增加" : "减少"}
              {Math.abs(profile.currentWeightKg - profile.prePregnancyWeightKg).toFixed(1)}kg。
            </p>
          </div>
          <div className="planProfile">
            <span>{scenarioLabels[profile.scenario]}</span>
            <span>{deliveryLabels[profile.deliveryMode]}</span>
            <span>{feedingLabels[profile.feedingMode]}</span>
            <span>{activityLabels[profile.activityLevel]}</span>
            <button className="ghostButton" type="button" onClick={() => setPage("library")}>
              食谱库
            </button>
            <button className="ghostButton" type="button" onClick={() => setPage("special")}>
              专项页
            </button>
            <button className="ghostButton" type="button" onClick={printPlan}>
              打印42天
            </button>
            <button className="saveButton" type="button" onClick={saveCurrentPlan}>
              保存方案
            </button>
            <button className="ghostButton" type="button" onClick={() => setPage("setup")}>
              修改诉求
            </button>
          </div>
        </div>
      </section>

      <section className="planWorkspace">
        <section className="panel dayPanel">
          <div>
            <p className="eyebrow">42天日历</p>
            <h2>选择查看哪一天</h2>
          </div>
          <div className="dayPicker" aria-label="选择42天中的一天">
            {result.days.map((day) => (
              <button
                key={day.day}
                type="button"
                className={day.day === profile.postpartumDay ? "currentDay" : ""}
                onClick={() => setProfileField("postpartumDay", day.day)}
              >
                {day.day}
              </button>
            ))}
          </div>
        </section>

        <section className="noticeGrid">
          {result.riskWarnings.map((warning) => (
            <p className="warning" key={warning}>
              {warning}
            </p>
          ))}
        </section>
        {saveMessage && <p className="saveMessage inlineSaveMessage">{saveMessage}</p>}

        <section className="panel conditionGuidePanel">
          <div>
            <p className="eyebrow">病种与原则适配</p>
            <h2>当前方案的重点规则</h2>
          </div>
          <div className="conditionGuideGrid">
            {result.conditionGuides.map((guide) => (
              <p key={guide}>{guide}</p>
            ))}
          </div>
        </section>

        <section className="sectionHeader">
          <div>
            <p className="eyebrow">今日食谱</p>
            <h2>三餐、汤饮、加餐与做法</h2>
          </div>
          <p>每张卡片包含食材克数、调味、步骤、替换项和食品卫生提醒。</p>
        </section>

        <section className="mealGrid planMealGrid">
          <RecipeCard title="早餐" recipe={selectedDay.breakfast} />
          <RecipeCard title="午餐" recipe={selectedDay.lunch} />
          <RecipeCard title="晚餐" recipe={selectedDay.dinner} />
          <RecipeCard title="汤饮" recipe={selectedDay.soup} />
          {selectedDay.snacks.map((snack, index) => (
            <RecipeCard key={`${snack.id}-${index}`} title={index === 0 ? "加餐一" : "加餐二"} recipe={snack} />
          ))}
        </section>

        <section className="panel infoPanel planInfoPanel">
          <div>
            <h2>水果与今日营养重点</h2>
            <p className="fruit">{selectedDay.fruit}</p>
            <ul>
              {selectedDay.nutritionFocus.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2>规则说明</h2>
            {selectedDay.ruleNotes.length > 0 ? (
              <ul>
                {selectedDay.ruleNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : (
              <p>当前没有额外忌口，系统按阶段、哺乳和目标诉求轮换菜单。</p>
            )}
            {result.replacedOrAvoided.length > 0 && (
              <p className="muted">已避开候选菜：{result.replacedOrAvoided.join("、")}</p>
            )}
          </div>
        </section>

        <section className="panel recoveryPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">康复推荐</p>
              <h2>
                第 {result.selectedRecovery.day} 天 · {result.selectedRecovery.intensity}强度 ·{" "}
                {result.selectedRecovery.duration}
              </h2>
            </div>
            <div className="recoveryArt" aria-hidden="true">
              <span className="recoveryMat" />
              <span className="recoveryHead" />
              <span className="recoveryTorso" />
              <span className="recoveryArm" />
              <span className="recoveryLeg" />
            </div>
          </div>
          <div className="recoveryDashboard">
            {recoveryHighlights.map((item) => (
              <article className="recoveryMetricCard" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.note}</p>
              </article>
            ))}
          </div>
          <div className="metricTableWrap">
            <div className="metricTableHeader">
              <div>
                <h3>今日锻炼量化指标</h3>
                <p>先完成呼吸和盆底，再根据体力增加步行与关节活动。</p>
              </div>
              <span>动作后第二天不加重，下一天再维持或小幅增加</span>
            </div>
            <table className="metricTable">
              <thead>
                <tr>
                  <th>项目</th>
                  <th>目标量</th>
                  <th>频次</th>
                  <th>执行提醒</th>
                </tr>
              </thead>
              <tbody>
                {result.selectedRecovery.metrics.map((metric) => (
                  <tr key={metric.label}>
                    <td>{metric.label}</td>
                    <td>{metric.target}</td>
                    <td>{metric.frequency}</td>
                    <td>{metric.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="recoverySectionTitle">
            <div>
              <p className="eyebrow">动作处方</p>
              <h3>按顺序完成，任何不适立即降量</h3>
            </div>
          </div>
          <div className="actionGrid compactActionGrid">
            {result.selectedRecovery.actions.map((action) => (
              <article className="actionCard" key={action.name}>
                <h3>{action.name}</h3>
                <p className="duration">{action.duration}</p>
                <ol>
                  {action.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <p className="muted">适合：{action.suitableFor.join("、")}</p>
                <p className="safety">暂停：{action.avoidWhen.join("、")}</p>
              </article>
            ))}
          </div>
          <div className="stopBox">
            <strong>出现以下情况停止并就医</strong>
            <p>{result.selectedRecovery.stopSignals.join("；")}</p>
          </div>
        </section>

        <section className="panel principlePanel">
          <h2>营养与食品卫生依据</h2>
          <div className="principleGrid">
            {result.nutritionPrinciples.map((principle) => (
              <p key={principle}>{principle}</p>
            ))}
          </div>
          <div className="sourceLinks">
            <a href="https://dg.cnsoc.org/article/04/hjgfxca3Ra69sKbvqDETbg.html" target="_blank" rel="noreferrer">
              中国孕妇、乳母膳食指南2022
            </a>
            <a href="https://www.who.int/publications/i/item/9789240045989" target="_blank" rel="noreferrer">
              WHO产后护理指南2022
            </a>
            <a
              href="https://www.cdc.gov/breastfeeding-special-circumstances/hcp/diet-micronutrients/maternal-diet.html"
              target="_blank"
              rel="noreferrer"
            >
              CDC母乳期饮食
            </a>
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;
