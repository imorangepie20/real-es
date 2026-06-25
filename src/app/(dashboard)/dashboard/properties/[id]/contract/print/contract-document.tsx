// 계약 양식 A4 문서 렌더 — 인쇄용. 실무 보조 서식이며 공식 표준양식이 아니다.
import type { ReactNode } from "react";

import { PROPERTY_LABEL } from "@/lib/naver/property-types";
import { TRADE_LABEL } from "@/lib/naver/trade-types";

type P = Record<string, unknown>;

const won = (v: unknown) => (v == null || v === "" ? "" : Number(v).toLocaleString("ko-KR"));
const ymd = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return s.length === 8 ? `${s.slice(0, 4)}년 ${s.slice(4, 6)}월 ${s.slice(6, 8)}일` : "";
};
const text = (v: unknown) => (v == null ? "" : String(v));

/** 값이 있으면 표시, 없으면 밑줄 기입란 */
function Fill({ value, w = "100%" }: { value?: string; w?: string }) {
  if (value) return <span className="font-medium">{value}</span>;
  return <span className="inline-block border-b border-dotted border-gray-500 align-bottom" style={{ minWidth: w }}>&nbsp;</span>;
}

/** 1. 부동산의 표시 */
function PropertyTable({ p }: { p: P }) {
  const reType = PROPERTY_LABEL[text(p.realEstateType)] ?? text(p.realEstateType);
  return (
    <table className="w-full border-collapse border border-black">
      <tbody>
        <tr>
          <th className="w-24 border border-black bg-gray-100 px-2 py-2 text-center font-semibold">소재지</th>
          <td className="border border-black px-2 py-2" colSpan={5}>
            <Fill value={text(p.address)} w="80%" />
            {p.complexName ? <span className="ml-2 text-gray-600">({text(p.complexName)})</span> : null}
          </td>
        </tr>
        <tr>
          <th className="border border-black bg-gray-100 px-2 py-2 text-center font-semibold">토 지</th>
          <td className="w-16 border border-black bg-gray-50 px-2 py-2 text-center">지목</td>
          <td className="border border-black px-2 py-2"><Fill /></td>
          <td className="w-16 border border-black bg-gray-50 px-2 py-2 text-center">대지면적</td>
          <td className="border border-black px-2 py-2" colSpan={2}>
            <Fill value={p.landArea ? `${text(p.landArea)} ㎡` : ""} w="40%" />
          </td>
        </tr>
        <tr>
          <th className="border border-black bg-gray-100 px-2 py-2 text-center font-semibold">건 물</th>
          <td className="border border-black bg-gray-50 px-2 py-2 text-center">구조·용도</td>
          <td className="border border-black px-2 py-2"><Fill value={reType} w="50%" /></td>
          <td className="border border-black bg-gray-50 px-2 py-2 text-center">면적</td>
          <td className="border border-black px-2 py-2" colSpan={2}>
            전용 <Fill value={p.areaExclusive ? `${text(p.areaExclusive)}㎡` : ""} w="25%" />
            <span className="mx-2 text-gray-400">/</span>
            공급 <Fill value={p.areaSupply ? `${text(p.areaSupply)}㎡` : ""} w="25%" />
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** 금액 명세 행 */
function AmountRow({ label, amount, note }: { label: string; amount?: string; note?: ReactNode }) {
  return (
    <tr>
      <th className="w-24 border border-black bg-gray-100 px-2 py-2 text-center font-semibold">{label}</th>
      <td className="border border-black px-2 py-2">
        金 <Fill value={amount ? `${amount}` : ""} w="45%" /> 원정 {amount ? <span className="text-gray-600">(₩{amount})</span> : <span className="text-gray-500">(₩&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</span>}
      </td>
      <td className="w-[42%] border border-black px-2 py-2 text-gray-700">{note}</td>
    </tr>
  );
}

function SaleAmount({ p }: { p: P }) {
  return (
    <table className="w-full border-collapse border border-black">
      <tbody>
        <AmountRow label="매매대금" amount={won(p.dealAmount)} note="아래 지불방법에 따라 지불한다." />
        <AmountRow label="계약금" note="계약 체결 시 지불하고 영수함." />
        <AmountRow label="중도금" note={<>지불일&nbsp;<Fill value={ymd(p.interim1Date)} w="55%" /></>} />
        <AmountRow label="잔 금" note={<>지불일&nbsp;<Fill value={ymd(p.balanceDate)} w="55%" /></>} />
      </tbody>
    </table>
  );
}

function LeaseAmount({ p, monthly }: { p: P; monthly: boolean }) {
  return (
    <table className="w-full border-collapse border border-black">
      <tbody>
        <AmountRow label="보증금" amount={won(p.price)} note="아래 지불방법에 따라 지불한다." />
        <AmountRow label="계약금" note="계약 체결 시 지불하고 영수함." />
        <AmountRow label="잔 금" note={<>지불일&nbsp;<Fill value={ymd(p.balanceDate)} w="55%" /></>} />
        {monthly ? (
          <AmountRow label="차임(월세)" amount={won(p.rentPrice)} note="매월 말일 지불(후불)." />
        ) : null}
      </tbody>
    </table>
  );
}

/** 표준 조문 */
function Articles({ items }: { items: [string, string][] }) {
  return (
    <ol className="space-y-1.5 text-[12px] leading-relaxed">
      {items.map(([title, body], i) => (
        <li key={i}>
          <span className="font-semibold">제{i + 1}조 ({title})</span> {body}
        </li>
      ))}
    </ol>
  );
}

/** 특약사항 */
function SpecialTerms() {
  return (
    <div>
      <p className="mb-1 font-semibold">특약사항</p>
      <div className="min-h-[72px] border border-black p-2 leading-[1.9] text-gray-400">
        {[1, 2, 3].map((n) => (
          <div key={n} className="border-b border-dotted border-gray-300 last:border-0">&nbsp;</div>
        ))}
      </div>
    </div>
  );
}

/** 서명·날인란 */
function Signatures({ roles }: { roles: { label: string; name?: string }[] }) {
  return (
    <table className="w-full border-collapse border border-black text-[11px]">
      <tbody>
        {roles.map((r, i) => (
          <tr key={i}>
            <th className="w-20 border border-black bg-gray-100 px-2 py-2 text-center font-semibold">{r.label}</th>
            <td className="w-12 border border-black bg-gray-50 px-1 py-2 text-center">주소</td>
            <td className="border border-black px-2 py-2" colSpan={3}><Fill /></td>
          </tr>
        ))}
        <tr className="h-0"><td className="border-0 p-0" colSpan={5} /></tr>
        {roles.map((r, i) => (
          <tr key={`s${i}`}>
            <th className="border border-black bg-gray-100 px-2 py-2 text-center font-semibold">{r.label}</th>
            <td className="border border-black bg-gray-50 px-1 py-2 text-center">주민번호</td>
            <td className="w-[28%] border border-black px-2 py-2"><Fill /></td>
            <td className="w-12 border border-black bg-gray-50 px-1 py-2 text-center">성명</td>
            <td className="border border-black px-2 py-2">
              <Fill value={r.name} w="40%" /> <span className="ml-1 text-gray-500">(인)</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DateLine() {
  return <p className="my-5 text-center tracking-widest">년 &nbsp;&nbsp; 월 &nbsp;&nbsp; 일</p>;
}

/** ───────── 양식별 본문 ───────── */

function SaleContract({ p }: { p: P }) {
  const arts: [string, string][] = [
    ["목적", "위 부동산의 매매에 대하여 매도인과 매수인은 합의에 의하여 매매대금을 위와 같이 지불하기로 한다."],
    ["소유권 이전 등", "매도인은 매매대금의 잔금을 수령함과 동시에 매수인에게 소유권이전등기에 필요한 모든 서류를 교부하고 등기절차에 협력하며, 위 부동산을 인도한다."],
    ["제한물권 등의 소멸", "매도인은 위 부동산에 설정된 저당권·지상권·임차권 등 소유권 행사를 제한하는 권리나 미납 조세·공과금 등을 잔금 수령 전까지 그 권리의 하자 및 부담 등을 제거하여 완전한 소유권을 매수인에게 이전한다."],
    ["지방세 등", "위 부동산에 관하여 발생한 수익의 귀속과 제세공과금 등의 부담은 인도일을 기준으로 정산한다."],
    ["계약의 해제", "매수인이 매도인에게 중도금(중도금이 없을 때는 잔금)을 지불하기 전까지 매도인은 계약금의 배액을 상환하고, 매수인은 계약금을 포기하고 본 계약을 해제할 수 있다."],
    ["채무불이행과 손해배상", "매도인 또는 매수인이 본 계약상의 내용을 이행하지 않을 경우 상대방은 불이행한 자에게 서면으로 최고하고 계약을 해제할 수 있으며, 손해배상을 청구할 수 있다."],
    ["중개보수", "개업공인중개사는 매도인과 매수인의 본 계약 불이행에 대하여 책임을 지지 않는다. 중개보수는 본 계약 체결과 동시에 거래 당사자 쌍방이 각각 지불한다."],
    ["확인·설명서 교부 등", "개업공인중개사는 중개대상물 확인·설명서를 작성하고 업무보증관계증서 사본을 첨부하여 거래 당사자 쌍방에게 교부한다."],
  ];
  return (
    <>
      <p className="mb-3 text-[12px]">매도인과 매수인 쌍방은 아래 표시 부동산에 관하여 다음 계약 내용과 같이 매매계약을 체결한다.</p>
      <Section n="1. 부동산의 표시"><PropertyTable p={p} /></Section>
      <Section n="2. 계약내용 — 매매대금"><SaleAmount p={p} /></Section>
      <Section><Articles items={arts} /></Section>
      <Section><SpecialTerms /></Section>
      <DateLine />
      <Signatures roles={[{ label: "매도인", name: text(p.customerName) }, { label: "매수인" }, { label: "개업\n공인중개사" }]} />
    </>
  );
}

function LeaseContract({ p }: { p: P }) {
  const t = text(p.tradeType);
  const monthly = t === "B2";
  const arts: [string, string][] = [
    ["목적", "위 부동산의 임대차에 관하여 임대인과 임차인은 합의에 의하여 보증금 및 차임을 위와 같이 지불하기로 한다."],
    ["존속기간", "임대인은 위 부동산을 임대차 목적대로 사용·수익할 수 있는 상태로 인도하며, 임대차 기간은 인도일로부터 ___ 까지로 한다."],
    ["용도변경 및 전대 등", "임차인은 임대인의 동의 없이 위 부동산의 용도나 구조를 변경하거나 전대·임차권 양도 또는 담보제공을 하지 못하며, 임대차 목적 이외의 용도로 사용할 수 없다."],
    ["계약의 해지", "임차인의 차임 연체액이 2기의 차임액에 달하거나 제3조를 위반하였을 때 임대인은 즉시 본 계약을 해지할 수 있다."],
    ["계약의 종료", "임대차계약이 종료된 경우 임차인은 위 부동산을 원상으로 회복하여 임대인에게 반환하고, 임대인은 보증금을 임차인에게 반환한다."],
    ["계약의 해제", "임차인이 임대인에게 중도금(중도금이 없을 때는 잔금)을 지불하기 전까지 임대인은 계약금의 배액을 상환하고, 임차인은 계약금을 포기하고 본 계약을 해제할 수 있다."],
    ["채무불이행과 손해배상", "임대인 또는 임차인이 본 계약상의 내용을 이행하지 않을 경우 상대방은 서면으로 최고하고 계약을 해제할 수 있으며, 손해배상을 청구할 수 있다."],
    ["중개보수", "중개보수는 본 계약 체결과 동시에 거래 당사자 쌍방이 각각 지불하며, 개업공인중개사의 고의나 과실 없이 본 계약이 무효·취소·해제되어도 중개보수는 지급한다."],
    ["확인·설명서 교부 등", "개업공인중개사는 중개대상물 확인·설명서를 작성하여 업무보증관계증서 사본을 첨부하여 거래 당사자 쌍방에게 교부한다."],
  ];
  return (
    <>
      <p className="mb-3 text-[12px]">임대인과 임차인 쌍방은 아래 표시 부동산에 관하여 다음 계약 내용과 같이 임대차계약을 체결한다.</p>
      <Section n="1. 부동산의 표시"><PropertyTable p={p} /></Section>
      <Section n="2. 계약내용 — 보증금 및 차임"><LeaseAmount p={p} monthly={monthly} /></Section>
      <Section><Articles items={arts} /></Section>
      <Section><SpecialTerms /></Section>
      <DateLine />
      <Signatures roles={[{ label: "임대인" }, { label: "임차인", name: text(p.customerName) }, { label: "개업\n공인중개사" }]} />
    </>
  );
}

function ConfirmStatement({ p }: { p: P }) {
  const reType = PROPERTY_LABEL[text(p.realEstateType)] ?? text(p.realEstateType);
  const row = (a: string, b: ReactNode) => (
    <tr>
      <th className="w-32 border border-black bg-gray-100 px-2 py-2 text-left font-semibold">{a}</th>
      <td className="border border-black px-2 py-2">{b}</td>
    </tr>
  );
  return (
    <table className="w-full border-collapse border border-black text-[12px]">
      <tbody>
        {row("소재지", <Fill value={text(p.address)} w="80%" />)}
        {row("대상물건 종류", <Fill value={reType} w="40%" />)}
        {row("면적", <>전용 <Fill value={p.areaExclusive ? `${text(p.areaExclusive)}㎡` : ""} w="25%" /> / 공급 <Fill value={p.areaSupply ? `${text(p.areaSupply)}㎡` : ""} w="25%" /> / 대지 <Fill value={p.landArea ? `${text(p.landArea)}㎡` : ""} w="25%" /></>)}
        {row("권리관계 (소유권·근저당 등)", <Fill />)}
        {row("실제 권리관계 또는 공시되지 않은 물건의 권리", <Fill />)}
        {row("입지조건 (도로·교통·교육 등)", <Fill />)}
        {row("관리에 관한 사항 (관리비·주차)", <Fill value={p.parkingCount ? `주차 ${text(p.parkingCount)}대` : ""} w="40%" />)}
        {row("거래예정금액", <Fill value={won(p.dealAmount) || won(p.price)} w="40%" />)}
        {row("중개보수", <Fill />)}
      </tbody>
    </table>
  );
}

function Receipt({ p }: { p: P }) {
  const amount = won(p.dealAmount) || won(p.price);
  return (
    <div className="mt-8">
      <table className="w-full border-collapse border-2 border-black">
        <tbody>
          <tr>
            <th className="w-28 border border-black bg-gray-100 px-3 py-3 text-center font-semibold">금 액</th>
            <td className="border border-black px-3 py-3 text-lg">金 <Fill value={amount} w="50%" /> 원정 {amount ? <span className="text-gray-600">(₩{amount})</span> : null}</td>
          </tr>
          <tr>
            <th className="border border-black bg-gray-100 px-3 py-3 text-center font-semibold">부동산 표시</th>
            <td className="border border-black px-3 py-3"><Fill value={text(p.address)} w="80%" /></td>
          </tr>
        </tbody>
      </table>
      <p className="my-6 text-center text-[13px]">위 금액을 부동산 거래대금으로 정히 영수합니다.</p>
      <DateLine />
      <div className="mt-2 text-right">영수인&nbsp;&nbsp;<Fill value={text(p.customerName)} w="30%" /> <span className="ml-1 text-gray-500">(인)</span></div>
    </div>
  );
}

function PowerOfAttorney({ p }: { p: P }) {
  return (
    <div className="mt-6 space-y-5 text-[13px] leading-relaxed">
      <table className="w-full border-collapse border border-black text-[12px]">
        <tbody>
          <tr><th className="w-24 border border-black bg-gray-100 px-2 py-2 text-center font-semibold">위임인</th><td className="border border-black px-2 py-2">성명 <Fill w="30%" /> &nbsp; 연락처 <Fill w="30%" /></td></tr>
          <tr><th className="border border-black bg-gray-100 px-2 py-2 text-center font-semibold">수임인</th><td className="border border-black px-2 py-2">성명 <Fill w="30%" /> &nbsp; 연락처 <Fill w="30%" /></td></tr>
          <tr><th className="border border-black bg-gray-100 px-2 py-2 text-center font-semibold">부동산 표시</th><td className="border border-black px-2 py-2"><Fill value={text(p.address)} w="80%" /></td></tr>
        </tbody>
      </table>
      <div>
        <p className="font-semibold">위임사항</p>
        <p className="mt-1 leading-[2]">위 위임인은 수임인에게 위 표시 부동산에 관한 매매·임대차 계약의 체결 및 잔금 수령, 소유권이전등기 신청 등 일체의 행위를 위임합니다.</p>
      </div>
      <DateLine />
      <div className="text-right">위임인&nbsp;&nbsp;<Fill w="30%" /> <span className="ml-1 text-gray-500">(인)</span></div>
    </div>
  );
}

function Section({ n, children }: { n?: string; children: ReactNode }) {
  return (
    <section className="mt-4">
      {n ? <h2 className="mb-1.5 text-[13px] font-bold">{n}</h2> : null}
      {children}
    </section>
  );
}

const TITLES: Record<string, string> = {
  sale_contract: "부동산 매매계약서",
  lease_contract: "부동산 임대차계약서",
  confirm_residential: "중개대상물 확인·설명서 [주거용]",
  confirm_nonresidential: "중개대상물 확인·설명서 [비주거용]",
  receipt: "영 수 증",
  power_of_attorney: "위 임 장",
};

export function ContractDocument({ formId, property: p }: { formId: string; property: P }) {
  const t = text(p.tradeType);
  let title = TITLES[formId] ?? "계약 서식";
  if (formId === "lease_contract") title = `부동산 ${t === "B1" ? "전세" : t === "B2" ? "월세" : "임대차"}계약서`;

  let body: ReactNode = null;
  if (formId === "sale_contract") body = <SaleContract p={p} />;
  else if (formId === "lease_contract") body = <LeaseContract p={p} />;
  else if (formId === "confirm_residential" || formId === "confirm_nonresidential") body = <ConfirmStatement p={p} />;
  else if (formId === "receipt") body = <Receipt p={p} />;
  else if (formId === "power_of_attorney") body = <PowerOfAttorney p={p} />;

  return (
    <article className="mx-auto w-[210mm] bg-white px-[18mm] py-[16mm] font-serif text-[13px] text-black print:w-auto print:px-[14mm] print:py-0">
      <h1 className="text-center text-2xl font-bold tracking-[0.4em]">{title}</h1>
      <p className="mt-1 mb-4 text-center text-[11px] tracking-wide text-gray-500">
        {TRADE_LABEL[t] ? `${TRADE_LABEL[t]} · ` : ""}실무 보조용 서식 — 공식 표준양식 아님
      </p>
      {body}
    </article>
  );
}
