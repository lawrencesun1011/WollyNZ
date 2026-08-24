import type { ReactNode } from "react";

export const metadata = {
  title: "新西兰低龄插班游学攻略 · WollyNZ",
};

/* 图片占位块 */
function ImgPlaceholder({ label }: { label: string }) {
  return (
    <div className="my-6 flex h-48 items-center justify-center rounded-2xl border border-dashed border-primary/30 bg-primary/5 text-sm text-caption">
      {label}
    </div>
  );
}

/* 提示框：type=warning | tip */
function Callout({
  children,
  type = "tip",
}: {
  children: ReactNode;
  type?: "warning" | "tip";
}) {
  const styles =
    type === "warning"
      ? "border-warning/40 bg-warning/10 text-ink"
      : "border-primary/30 bg-primary/5 text-ink";
  return (
    <div className={`my-4 rounded-xl border px-4 py-3 text-sm leading-relaxed ${styles}`}>
      {children}
    </div>
  );
}

function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="mt-12 scroll-mt-24 text-2xl font-bold tracking-tight text-ink">
      {children}
    </h2>
  );
}

function H3({ children }: { children: ReactNode }) {
  return <h3 className="mt-6 text-lg font-semibold text-ink">{children}</h3>;
}

function P({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-[15px] leading-7 text-ink-soft">{children}</p>;
}

function Ol({ children }: { children: ReactNode }) {
  return <ol className="mt-3 space-y-2 text-[15px] leading-7 text-ink-soft list-decimal pl-6">{children}</ol>;
}

function Ul({ children }: { children: ReactNode }) {
  return <ul className="mt-3 space-y-2 text-[15px] leading-7 text-ink-soft list-disc pl-6">{children}</ul>;
}

/* 表格 */
function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-primary/5">
            {headers.map((h) => (
              <th key={h} className="border-b border-border px-4 py-3 text-left font-semibold text-ink">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="odd:bg-white even:bg-primary/[0.03]">
              {row.map((cell, j) => (
                <td key={j} className="border-b border-border px-4 py-3 align-top text-ink-soft">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TOC = [
  { id: "fit", label: "一、适合吗？" },
  { id: "timing", label: "二、最佳时间 & 周期" },
  { id: "visa", label: "三、签证办理" },
  { id: "city", label: "四、城市怎么选" },
  { id: "school", label: "五、DIY选校" },
  { id: "offer", label: "六、拿到Offer后" },
  { id: "stay", label: "七、住宿租车机票" },
  { id: "prep", label: "八、行前 & 入境" },
  { id: "qa", label: "九、高频Q&A" },
];

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="grid gap-10 lg:grid-cols-[1fr_220px]">
        {/* 主内容 */}
        <article className="min-w-0">
          {/* Hero */}
          <header>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              低龄留学 · 游学攻略
            </span>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              新西兰低龄全真插班游学｜DIY完整攻略
            </h1>
            <p className="mt-3 text-[15px] leading-7 text-ink-soft">
              拒绝走马观花夏令营，真正进入本地公立学校上课，沉浸式体验新西兰校园教育，适合想要提前试水海外教育的亲子家庭。
            </p>
            <ImgPlaceholder label="封面图占位：亲子插班主题" />
          </header>

          {/* 一 */}
          <H2 id="fit">一、先判断：你的家庭适合新西兰短期插班吗？</H2>
          <H3>什么是全真插班</H3>
          <P>
            新西兰<strong className="text-ink">全真短期插班</strong>，区别于语言夏令营、观光研学。孩子以国际生身份入读本地公立学校，分配到对应年龄班级，和新西兰本土学生一同上英语、数学、科学、体育、艺术、户外课程，亲身感受真实课堂氛围与校园文化。
          </P>
          <P>
            它不只是短期提升英语，更可以作为低龄留学的低成本试金石，帮家长判断孩子是否适配海外学习模式。
          </P>
          <Callout type="warning">
            ⚠️ 插班并非随时可去，学校需要具备接收国际生资质、有空余学位，同时匹配孩子年龄、入学时段才可以申请。
          </Callout>
          <Callout>
            移民局提示：持访问签可以短期就读；超过规定时长，则需要办理学生签证；接收国际生的学校必须遵守国际生照护规范。
          </Callout>

          <H3>家庭适配条件</H3>
          <Ol>
            <li>
              <strong className="text-ink">时间要求</strong>：建议最少安排 2‑4 周，绝大多数公立学校最低申请周期为 <strong className="text-ink">4 周</strong>。
              <Ul>
                <li>3‑10 周岁：必须家长全程陪同，不接受祖辈代为监护；</li>
                <li>11 周岁以上：可选择寄宿家庭 Homestay。</li>
              </Ul>
            </li>
            <li>
              <strong className="text-ink">语言水平</strong>：不需要孩子英语流利、完全听懂课堂。学校配有 ESOL 语言辅导，老师会对国际插班生做适配。但如果孩子极度抗拒陌生环境，前期适应压力会很大。
            </li>
            <li>
              <strong className="text-ink">预算参考</strong>：开销包含学费、机票、签证、住宿、保险、本地交通、日常生活费。一大一小插班 4 周，整体花费约 5 万人民币。把它看作一次教育体验投资，而非普通旅游。
            </li>
          </Ol>

          {/* 二 */}
          <H2 id="timing">二、最佳出行时间 &amp; 申请准备周期</H2>
          <P>
            新西兰中小学一年设置 <strong className="text-ink">4 个学期</strong>，仅学期内可以插班上课，假期学校不接收插班生。
          </P>
          <ImgPlaceholder label="2026‑2027 官方学期日历截图占位" />
          <Callout>
            幼儿园：除去公共假期，全年可安排入读。中小学：只能在学期上课时段插班。
          </Callout>

          <H3>规划时间轴</H3>
          <Callout type="tip">✅ 理想节奏：<strong className="text-ink">提前 5‑6 个月启动准备</strong></Callout>
          <Ol>
            <li>提前 6 个月：敲定出行时间、家庭预算；</li>
            <li>提前 5 个月：筛选目标城市学校，准备材料、邮件咨询学位；</li>
            <li>拿到录取 Offer 后，再处理缴费、保险、住宿、机票、行前全部事项。</li>
          </Ol>
          <Callout type="warning">
            寒暑假、春节属于出行旺季，学位紧张，尽量避开临近出发才申请，容易遇到无学位、住宿涨价、可选学校变少。
          </Callout>
          <ImgPlaceholder label="6 个月 DIY 申请计划表占位" />

          {/* 三 */}
          <H2 id="visa">三、签证怎么办理</H2>
          <Ol>
            <li>
              <strong className="text-ink">3 个月以内插班（绝大多数家庭）：办理旅游访问签</strong>
              <br />
              大人、孩子统一申请旅游签，单次最多停留 90 天，允许最长 90 天短期在校学习。
            </li>
            <li>
              <strong className="text-ink">插班超过 3 个月</strong>：孩子申请学生签证，家长办理陪读签证。
            </li>
          </Ol>

          {/* 四 */}
          <H2 id="city">四、城市怎么选（五大城市对比）</H2>
          <Table
            headers={["城市", "核心特点", "学校资源", "生活 & 开销", "适合家庭"]}
            rows={[
              ["奥克兰", "新西兰最大城市，中餐、亚洲超市齐全，生活便利", "优质学校多，热门学区学位竞争激烈", "住宿、用车成本偏高", "第一次去新西兰，看重生活便利的家庭"],
              ["汉密尔顿", "离奥克兰 1.5 小时车程，田园氛围，节奏舒缓", "学校选择少于奥克兰，但学位相对宽松", "整体性价比高", "想要安静校园体验，预算友好家庭"],
              ["基督城（南岛）", "南岛最大城市，环境安全安稳", "南岛教育资源丰富均衡", "开销低于皇后镇，高于汉密尔顿", "偏好南岛，追求安全、成本可控"],
              ["惠灵顿（首都）", "文化艺术资源丰富，城市紧凑，风大", "学校质量稳定，但可选数量不多", "住宿成本偏高", "喜欢博物馆、人文体验的家庭"],
              ["皇后镇", "世界级风景，户外资源强，滑雪徒步", "可接收插班的学校很少，申请不确定性高", "整体开销最高", "兼顾孩子上课，家长侧重度假旅行"],
            ]}
          />
          <Callout type="tip">
            👉 快速建议：优先便利选奥克兰；追求性价比选汉密尔顿、基督城；看重风景旅行选皇后镇。
          </Callout>

          {/* 五 */}
          <H2 id="school">五、DIY选校两种方式</H2>
          <H3>方式1：免费官网 DIY（自己操作）</H3>
          <P>官网：Education Counts（新西兰教育局官网）</P>
          <ImgPlaceholder label="官网操作步骤 4 张截图占位" />
          <Ol>
            <li>打开官网，点击「Find your nearest school」查找附近学校；</li>
            <li>通过地址或者校名检索，地图放大查看目标区域学校；</li>
            <li>点击「view school details」进入学校详情页；</li>
            <li>获取学校官方邮箱、官网地址，写英文邮件咨询：<strong className="text-ink">目标插班时间段、孩子年龄，询问是否接收短期国际插班、有无学位，索要申请材料清单。</strong></li>
          </Ol>
          <Callout type="tip">实操小技巧：一次性挑选 10 所意向学校群发邮件，提升拿到学位概率。</Callout>

          <H3>方式2：现成学校资料包</H3>
          <P>包含学校位置、评分、课程、学费、周边住宿、申请邮箱、英文邮件模板、材料清单。</P>

          <H3>完整申请全流程</H3>
          <Ol>
            <li>选定目标城市，筛选 10 所意向学校；</li>
            <li>邮件逐一咨询学校对应时段学位情况；</li>
            <li>确认有学位，递交申请表和全套申请材料；</li>
            <li>同步办理旅游签证；</li>
            <li>接收学校 Offer 以及缴费账单 Invoice，跨境汇款缴纳学费，记得备注学校提供的编码；</li>
            <li>和学校确认学费到账；</li>
            <li>敲定住宿、机票、本地租车；</li>
            <li>采购 / 租赁校服；</li>
            <li>获取学校入学须知；</li>
            <li>核对行李清单；</li>
            <li>按时到校报到。</li>
          </Ol>

          {/* 六 */}
          <H2 id="offer">六、拿到 Offer 之后，必办事项</H2>
          <H3>1. 学费缴纳</H3>
          <P>
            学校会发送 Invoice 缴费单，上面标注学校对公账户，通过手机银行跨境汇款，<strong className="text-ink">务必填写学校指定备注编码，方便学校匹配学生信息</strong>。
          </P>
          <H3>2. 保险（硬性要求）</H3>
          <Ul>
            <li>学生：<strong className="text-ink">必须购买新西兰本地学校指定的学生保险</strong>；</li>
            <li>家长：选购国内平台出境旅游险即可，不作强制。</li>
          </Ul>
          <H3>3. 入学报到须知</H3>
          <P>报到时间：开学第一天早上 8:45 前往学校办公室签到。携带材料（纸质或提前邮件发送学校）：</P>
          <Ul>
            <li>保险凭证</li>
            <li>签证页</li>
            <li>家长和孩子护照</li>
            <li>新西兰本地居住地址、联系手机号</li>
          </Ul>

          <H3>校园生活细节</H3>
          <P>1. <strong className="text-ink">餐食：学校无食堂，全部自带便当盒</strong></P>
          <Table
            headers={["时段", "时间", "食物参考"]}
            rows={[
              ["课间加餐", "约 10:00", "水果、蔬菜"],
              ["早茶", "11:00", "酸奶、奶酪、水果、饼干等"],
              ["午餐", "13:00", "三明治、卷饼、意面、寿司等"],
            ]}
          />
          <Callout type="warning">饮品<strong className="text-ink">只允许清水</strong>，不要带果汁、调味奶。</Callout>
          <P>2. <strong className="text-ink">校服</strong></P>
          <P>
            多数学校强制校服。两个渠道：向校方购买全新校服；租赁学校二手校服，离校归还。
          </P>
          <Ul>
            <li>春夏学期户外活动必须戴帽子；</li>
            <li>冬季可内搭深蓝 / 黑色保暖内衣；袜子深蓝、黑色；鞋子雨衣自备。</li>
          </Ul>
          <P>3. 电子设备 BYOD：允许学生自带平板、笔记本，学校会开设学生邮箱，需要签署设备使用协议，自备耳机。</P>
          <P>4. 文具：开学学校统一配发，无需自备。</P>

          {/* 七 */}
          <H2 id="stay">七、住宿、租车、机票实操指南</H2>
          <H3>🏠 住宿渠道对比</H3>
          <Table
            headers={["住宿渠道", "优势", "劣势", "适配家庭"]}
            rows={[
              ["Airbnb / Booking", "房源多，平台担保，退改规则清晰", "旺季价格上浮，有服务费清洁费", "初次到访，希望省心的亲子家庭"],
              ["Homestay 寄宿家庭", "沉浸式本地生活，英文环境好", "自由度低，需要适应房东作息饮食", "孩子希望深度体验本地家庭，11 岁以上可独立入住；5‑11 岁可申请亲子寄宿"],
              ["Bookabach 度假屋", "整套家庭房源，空间大", "部分房源离学校远，退改条款严格", "自驾，追求居家独立空间"],
              ["本地中介短租", "有机会拿到实惠租金", "房东大多偏好长租，短租难谈", "停留 1 个月以上，愿意沟通合同"],
              ["华人社群资源", "沟通无障碍", "缺少平台保障，警惕私下转账风险", "有本地熟人协助的家庭"],
              ["酒店 / 服务公寓", "省心安全，落地过渡首选", "长期住成本高，厨房洗衣条件有限", "刚落地短期过渡居住"],
            ]}
          />
          <Callout type="tip">
            ✨ 重要提醒：<strong className="text-ink">先拿到学校 Offer、确定学校位置，再订住宿！</strong>不要反向操作，避免通勤太远。优先看离学校通勤距离，大于风景；确认房源具备厨房、洗衣机、停车位；旺季提前预订；不确认学位不要下单不可退房源；低龄孩子家庭优先整套租住。
          </Callout>

          <H3>🚗 本地租车</H3>
          <P>
            新西兰公共交通薄弱，除市中心外，强烈建议自驾。可选渠道：本地车行 Go Rental、Yes Rental、Hertz、Ezi；国内平台租租车、携程飞猪；华人车行。
          </P>
          <Callout type="warning">
            重要提示：租车务必选购<strong className="text-ink">全险</strong>，本地车行理赔流程更顺畅；国内平台价格或许优惠，但理赔周期较长。国内驾照提前做好英文翻译件。
          </Callout>

          <H3>✈ 机票</H3>
          <P>
            旺季务必提早预订；落地时间建议比开学提前 <strong className="text-ink">2‑3 天</strong>，预留倒时差、取车、熟悉住处的缓冲，不要周日落地周一直接上学。
          </P>

          {/* 八 */}
          <H2 id="prep">八、行前准备 &amp; 入境提示</H2>
          <Ol>
            <li>行李清单：可参考完整版文档《新西兰插班行李必备清单》；</li>
            <li>海关：务必阅读新西兰入境物品申报指南，清楚哪些物品禁止携带，规范填写入境申报单；</li>
            <li>课余安排：放学后、周末可以安排森林学校、周边短途自驾研学。</li>
          </Ol>

          {/* 九 */}
          <H2 id="qa">九、高频 Q&amp;A</H2>
          <P><strong className="text-ink">Q：爷爷奶奶陪同孩子过来插班，可以吗？</strong></P>
          <P>A：不行。3‑10 岁学校要求法定监护人陪同，遇到突发情况需要监护人处理。</P>
          <P><strong className="text-ink">Q：学校最少要求 4 周，但是我只有 2 周假期怎么办？</strong></P>
          <P>A：可以申请缴纳 4 周学费，实际就读 2 周，但会产生学费浪费，不推荐。</P>
          <P><strong className="text-ink">Q：距离出发只剩不到 3 个月，还来得及申请吗？</strong></P>
          <P>A：部分情况可操作，但热门学校大概率无空余学位，需要快速筛选备选院校。</P>
          <P><strong className="text-ink">Q：想插班半年以上，签证怎么处理？</strong></P>
          <P>A：孩子办理学生签证，家长办理陪读签证。</P>

          {/* 附录 */}
          <H2 id="appendix">附：DIY 插班 6 个月时间规划简表</H2>
          <Ul>
            <li>第 1 月：确定出行城市，筛选目标学校，发送邮件咨询学位</li>
            <li>第 2 月：接收学校回复，锁定可申请院校</li>
            <li>第 3 月：准备全套申请材料，递交，同步办理签证</li>
            <li>第 4 月：接收 Offer、缴费单，跨境缴纳学费</li>
            <li>第 5 月：敲定住宿、保险、购买机票</li>
            <li>第 6 月：规划行程，采购校服，核对行李清单</li>
            <li>出行月：入境、安顿，正式入学</li>
          </Ul>
          <Callout type="tip">
            小贴士：新西兰插班属于教育体验，不是标准化旅游产品，学位、录取结果都取决于学校审核，越早规划，选择权越高。
          </Callout>
        </article>

        {/* 右侧目录（桌面端 sticky） */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-caption">目录</p>
            <nav className="space-y-2 text-sm">
              {TOC.map((t) => (
                <a
                  key={t.id}
                  href={`#${t.id}`}
                  className="block text-ink-soft transition-colors hover:text-primary"
                >
                  {t.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>
      </div>
    </div>
  );
}
