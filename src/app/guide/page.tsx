import type { ReactNode } from "react";
import Image from "next/image";
import { BookOpen, Clock3, MapPin } from "lucide-react";

export const metadata = {
  title: "新西兰低龄插班游学攻略 · GoalNZ",
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

/* 表格（带斑马纹 + 表头底色，支持首列加粗） */
function Table({
  headers,
  rows,
  emphasizeFirst = false,
}: {
  headers: string[];
  rows: string[][];
  emphasizeFirst?: boolean;
}) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-border shadow-sm">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gradient-to-r from-primary/10 to-primary/5">
            {headers.map((h) => (
              <th
                key={h}
                className="border-b border-border px-4 py-3 text-left font-semibold text-ink"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="odd:bg-white even:bg-primary/[0.03] transition-colors hover:bg-primary/10">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`border-b border-border px-4 py-3 align-top text-ink-soft ${
                    emphasizeFirst && j === 0 ? "font-semibold text-ink" : ""
                  }`}
                >
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
  { id: "think", label: "一、别激动，先思考！" },
  { id: "timing", label: "二、最佳时间 & 周期" },
  { id: "visa", label: "三、办理签证" },
  { id: "city", label: "四、城市怎么选" },
  { id: "school", label: "五、DIY 选校攻略" },
  { id: "life", label: "六、学校生活" },
  { id: "stay", label: "七、住宿" },
  { id: "qa", label: "八、高频 Q&A" },
];

export default function GuidePage() {
  return (
    <main className="guide-page">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_220px]">
          {/* 主内容 */}
          <article className="guide-article min-w-0 rounded-3xl p-6 sm:p-10">
            {/* Hero */}
            <header className="border-b border-stroke/70 pb-8">
              <span className="service-eyebrow chip inline-flex items-center gap-1.5 px-3 py-1 text-xs">
                <BookOpen className="h-3.5 w-3.5" />
                低龄插班 · 游学攻略
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                新西兰低龄全真插班游学｜DIY 完整攻略
              </h1>
              <p className="mt-3 text-[15px] leading-7 text-ink-soft">
                拒绝走马观花夏令营，沉浸式体验真实的新西兰教育。通过本攻略，可以不走弯路少踩坑，省钱省时，完全自主申请学校！
              </p>
              <Callout type="tip">
                💬 如果你看完还是一头雾水，可以加入我们的<strong className="text-ink">微信社群</strong>。我们会尽可能帮你解答申请学校的疑惑，或提供新西兰当地吃喝玩乐的资讯～
              </Callout>
              <div className="my-6 flex justify-center">
                <div className="overflow-hidden rounded-2xl border border-primary/10 bg-white p-3 shadow-sm">
                  <Image
                    src="/images/community/wechat-qrcode.png"
                    alt="微信社群二维码"
                    width={200}
                    height={200}
                    className="h-[200px] w-[200px]"
                  />
                </div>
              </div>
              <p className="text-center text-xs text-caption">长按或扫码加入社群</p>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-caption">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5 text-primary" />
                  提前 5–6 个月准备
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  面向新西兰中小学 &amp; 幼儿园插班家庭
                </span>
              </div>
            </header>

            {/* 一、别激动，先思考！ */}
            <H2 id="think">一、别激动，先思考！</H2>
            <P>
              你的家庭适合新西兰插班游学吗？你为什么要带孩子去游学？下面请跟着我一起认真了解和思考，不要冲动做决定！
            </P>

            <H3>1、什么是插班游学？</H3>
            <P>
              新西兰<strong className="text-ink">全真短期插班</strong> ≠ 机构开办的英语语言班、游学夏令营、研学等等项目。孩子们会以国际生的身份，进入新西兰当地的学校，根据年龄分配到对应的班级，和新西兰同龄学生同班就读。实打实体验当地真实校园氛围，获得原汁原味的沉浸式英语环境。
            </P>
            <div className="my-6 overflow-hidden rounded-2xl border border-primary/10 shadow-sm">
              <Image
                src="/images/guide/program-comparison.png"
                alt="新西兰研学与留学项目对比"
                width={1024}
                height={559}
                className="h-auto w-full"
              />
            </div>
            <div className="my-6 overflow-hidden rounded-2xl border border-primary/10 shadow-sm">
              <Image
                src="/images/guide/school-campus.jpg"
                alt="新西兰学校真实校园环境"
                width={1080}
                height={583}
                className="h-auto w-full"
              />
            </div>

            <Callout type="tip">
              💡 <strong className="text-ink">重要提醒</strong>
              <br />
              📌 <strong className="text-ink">避坑心理预期！短期插班 ≠ 英语速成班。</strong>
              千万别抱着“上一个月课，英语就突飞猛进”的期待哦，短短几周时间，想要速成英语不太现实。短期插班真正的宝藏之处，在于亲身体验海外真实校园，感受不一样的教育模式。同时，也是一次相对低成本“试水”，用来判断孩子是否适配未来长期留学。
            </Callout>
            <Callout type="warning">
              📌 <strong className="text-ink">插班并非随时可去</strong>，要确认学校是否接收短期国际生，是否有匹配孩子年龄、入学时段的学位。移民局提示：持访问签（旅游签证）可以短期就读；超过规定时长，则需要办理学生签证。
            </Callout>

            <H3>2、插班游学适配条件</H3>
            <Ol>
              <li>
                <strong className="text-ink">时间要求</strong>：建议最少安排 2‑4 周，新西兰绝大多数学校最低申请周期为{" "}
                <strong className="text-ink">4 周</strong>。
                <Ul>
                  <li>3‑10 周岁：必须家长全程陪同，不接受祖辈代为监护；</li>
                  <li>11 周岁以上：一定条件下可独立选择寄宿家庭 Homestay。</li>
                </Ul>
              </li>
              <li>
                <strong className="text-ink">语言水平</strong>：不需要孩子英语流利、完全听懂课堂。部分学校配有 ESOL 语言辅导，老师会对国际插班生做适配。但如果孩子抗拒陌生环境，极度内向且慢热，前期适应压力会比较大。
              </li>
              <li>
                <strong className="text-ink">预算参考</strong>：开销包含学费、机票、签证、住宿、保险、本地交通、日常生活费。一大一小插班 4 周，学费和生活整体花费约{" "}
                <strong className="text-ink">6 万人民币</strong>（此数据为平均值，具体因人而异）。把它看作一次教育体验投资，而非普通旅游。
              </li>
            </Ol>
            <ImgPlaceholder label="费用构成示意" />

            {/* 二、最佳出行时间 & 申请准备周期 */}
            <H2 id="timing">二、最佳出行时间 &amp; 申请准备周期</H2>
            <P>
              不同于中国中小学的学期制度，新西兰中小学一年设置 <strong className="text-ink">4 个学期</strong>
              ，仅学期内可以插班上课，假期学校不接收插班生。
            </P>
            <div className="my-6 overflow-hidden rounded-2xl border border-primary/10 shadow-sm">
              <Image
                src="/images/guide/term-calendar.png"
                alt="新西兰中小学学期日历示意（2027-2028 校历参考）"
                width={1024}
                height={559}
                className="h-auto w-full"
              />
            </div>
            <Callout type="tip">
              📌 <strong className="text-ink">幼儿园</strong>：除去公共假期，全年可安排入读。
              <strong className="text-ink">中小学</strong>：只能在学期上课时段插班。具体日期每年由新西兰教育部公布，请以官网为准。
            </Callout>

            <H3>规划时间</H3>
            <Callout type="tip">
              ✅ 理想计划：<strong className="text-ink">提前半年（甚至更早）启动准备</strong>
            </Callout>
            <Ol>
              <li>敲定出行时间、家庭预算；</li>
              <li>筛选目标城市学校，准备材料、邮件咨询学位；</li>
              <li>拿到录取 Offer 后，再处理签证、学费缴费、保险、住宿、机票等行前全部事项。</li>
            </Ol>
            <Callout type="warning">
              📌 寒暑假、春节属于出行旺季，学位紧张，机票住宿相对于淡季都会贵一些。尽量避开临近出发才申请，容易遇到可选学校很少，甚至无学位的情况。应当提前合理规划，尽早锁定想要去的学校，拿到申请。
            </Callout>

            {/* 三、办理签证 */}
            <H2 id="visa">三、办理签证</H2>
            <Ol>
              <li>
                <strong className="text-ink">普通旅游（访客）签证 Visitor Visa</strong>
                <br />
                ✅ 适合：3 个月内的短期插班的孩子，家长同样办旅游签陪着过去即可。
              </li>
              <li>
                <strong className="text-ink">学生签证 ➕ 监护人陪读签证</strong>（大家口中的学签和陪读签）
                <br />
                ✅ 适合：超过 3 个月的长期插班的孩子。
                <br />
                ⚠️ 陪读签证<strong className="text-ink">不是独立签证</strong>！必须绑定孩子的学生签证一起申请。
                <br />
                硬性规则：只能爸爸或者妈妈一位家长陪读，爷爷奶奶 / 外公外婆等亲戚都不能办陪读签；第二位家长只能办旅游签短期探望。
                <br />
                ⚠️ 孩子 <strong className="text-ink">≤ 10 周岁（Year 1‑6）</strong>：新西兰法律强制要求必须有父母监护人陪读，不能单独寄宿家庭。
              </li>
            </Ol>

            {/* 四、城市怎么选 */}
            <H2 id="city">四、城市怎么选（五大城市对比）</H2>
            <div className="my-6 overflow-hidden rounded-2xl border border-primary/10 shadow-sm">
              <Image
                src="/images/guide/city-map.png"
                alt="新西兰主要城市分布示意（北岛与南岛）"
                width={1024}
                height={559}
                className="h-auto w-full"
              />
            </div>
            <Table
              headers={["城市", "核心特点", "学校资源", "生活 &amp; 开销", "适合家庭", "推荐指数"]}
              rows={[
                ["奥克兰", "新西兰最大城市，中餐、亚洲超市齐全，生活便利", "优质学校多，热门学区学位竞争激烈", "住宿、用车成本偏高", "第一次去新西兰，看重生活便利的家庭", "⭐⭐⭐⭐⭐"],
                ["汉密尔顿", "离奥克兰 1.5 小时车程，田园氛围，节奏舒缓", "学校选择少于奥克兰，但学位相对宽松", "整体性价比高", "想要安静校园体验，预算友好家庭", "⭐⭐⭐⭐"],
                ["基督城（南岛）", "南岛最大城市，环境安全安稳", "南岛教育资源丰富均衡", "开销低于皇后镇，高于汉密尔顿", "偏好南岛，追求安全、成本可控", "⭐⭐⭐⭐"],
                ["惠灵顿（首都）", "文化艺术资源丰富，城市紧凑，风大", "学校质量稳定，但可选数量不多", "住宿成本偏高", "喜欢博物馆、人文体验的家庭", "⭐⭐⭐"],
                ["皇后镇", "世界级风景，户外资源强，滑雪徒步", "可接收插班的学校很少，申请不确定性高", "整体开销最高", "兼顾孩子上课，家长侧重度假旅行", "⭐⭐⭐"],
              ]}
              emphasizeFirst
            />
            <Callout type="tip">
              👉 建议：优先便利选奥克兰；追求性价比选汉密尔顿、基督城；重点想看风景和旅游选皇后镇。
            </Callout>

            {/* 五、DIY 选校攻略 */}
            <H2 id="school">五、DIY 选校攻略 · 完整申请全流程</H2>
            <P>
              <strong className="text-ink">第 1 步</strong>：根据自己的需求选定目标城市，在该城市筛选{" "}
              <strong className="text-ink">5‑10 所</strong>意向学校。
            </P>

            <H3>方法一：登录 Education Counts（新西兰教育局官网）</H3>
            <Ol>
              <li>打开官网，点击「Find your nearest school」查找附近学校；</li>
              <li>通过地址或者校名检索，地图放大查看目标区域学校；</li>
              <li>点击「view school details」进入学校详情页；</li>
              <li>获取学校官方邮箱、官网地址。</li>
            </Ol>

            <H3>方法二：参考本网站新西兰学校库 👍</H3>
            <P>
              有中文，不需要翻墙，更方便大家查阅，且可以将喜欢的学校对比。
            </P>

            <H3>完整申请全流程</H3>
            <Ol>
              <li>
                确定好学校和插班的准确时间后，发送英文邮件咨询：写清楚<strong className="text-ink">孩子的年龄、插班的具体时间段</strong>，询问学校是否接收短期国际插班、有无学位，以及让学校提供需要提交的申请材料清单。
              </li>
              <li>收到学校的邮件确认有学位后，递交所有的申请材料；</li>
              <li>同步可办理家长和孩子的签证；</li>
              <li>
                接收学校 Offer 以及缴费账单 Invoice，跨境汇款缴纳学费（记得备注学校提供的编码），缴费成功后和学校确认学费到账；记得找学校要入学须知，了解学校注意事项；
              </li>
              <li>购买机票，根据学校的地理位置去选定住宿；</li>
              <li>
                记得购买保险：学校一般会建议或指定购买某些新西兰品牌的保险，<strong className="text-ink">学生保险是硬性要求，必须购买</strong>。短期插班，家长的保险一般不作具体要求。
              </li>
              <li>收拾好行李：注意新西兰入境时管理严格，一定不能带违禁品；</li>
              <li>
                入学报到：开学第一天的早上，按照学校邮件的要求，携带材料（一般是签证页、护照、保险凭证等纸质版材料）去办公室办理注册签到。
              </li>
            </Ol>

            {/* 六、学校生活 */}
            <H2 id="life">六、学校生活</H2>
            <H3>1. 餐食：自带餐盒</H3>
            <P>
              学校基本都没有食堂，自带餐盒。食品可以带气味不是很大的食物，三明治、意大利面、寿司、蛋糕、炒饭等。点心可以带饼干、水果等。不同的学校可能还会有不同的要求，学校一般会在邮件里写出。冬天来新西兰插班的小朋友，可以购买保温餐盒。
            </P>
            <H3>2. 校服</H3>
            <P>多数学校必须穿校服，可在指定的商店去购买校服。</P>

            {/* 七、住宿 */}
            <H2 id="stay">七、住宿</H2>
            <P>
              <strong className="text-ink">短期插班最好先拿到学校 Offer，确定好了学校位置，再订住宿！</strong>
              不然有可能租好了房子，周围学区的学校已经没有学位了。
            </P>
            <Callout type="warning">
              ⚠️ 不买车租车的情况下，优先考虑学校通勤距离，公共交通并不是很方便。
            </Callout>
            <Callout type="warning">
              ⚠️ 确认房源具备厨房、冰箱、洗衣机、停车位等。
            </Callout>
            <Callout type="warning">
              ⚠️ 如果不是 Airbnb、Booking 等官方有保障的平台，在小红书、Facebook 等平台找房东私下租房，一定要记得提前验房！！！太多朋友因为租房踩坑了，房屋完全没有阳光、有严重的霉烂味道、甚至有虫蚁等问题，都很难在视频或照片中发现。
            </Callout>
            <Callout type="warning">
              ⚠️ 找私人房东租房，一定要注意合同是否能保护到自身的利益，不要签霸王条约。
            </Callout>

            {/* 八、其他高频问题 */}
            <H2 id="qa">八、其他高频问题</H2>
            <P>
              <strong className="text-ink">Q1：爸爸妈妈工作忙，可以让外公外婆爷爷奶奶来陪同孩子到新西兰插班吗？</strong>
            </P>
            <P>A：不行。3‑10 岁学校要求法定监护人陪同，遇到突发情况必须要监护人来处理。</P>
            <P>
              <strong className="text-ink">Q2：家里有两个孩子，签证的时候可以爸爸申请带一个，妈妈申请带一个来插班吗？</strong>
            </P>
            <P>A：不行。一般不论家里有几个小朋友，都是由一个监护人（爸爸或者妈妈）来陪同。</P>
            <P>
              <strong className="text-ink">Q3：学校要求最低 4 周的插班时限，但是家长或者孩子的假期没有这么久怎么办？</strong>
            </P>
            <P>A：需要家长发邮件给学校，部分学校可以申请缴纳 4 周的学费，实际就读不满 4 周，但多余的学费是不退还的。</P>
            <P>
              <strong className="text-ink">Q4：小朋友不是短期插班，是一年的插班，也是办理旅游签证吗？</strong>
            </P>
            <P>A：不行。孩子需要办理学生签证，监护人家长办理陪读签证。</P>
            <Callout type="warning">
              ⚠️ 越早规划，可选择的学校越多。旺季早点定机票住宿，价格也会相对优惠。同时，也要留给签证足够的时间～
            </Callout>
          </article>

          {/* 右侧目录（桌面端 sticky） */}
          <aside className="hidden lg:block">
            <div className="guide-toc sticky top-24 rounded-2xl p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-caption">阅读目录</p>
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
    </main>
  );
}
