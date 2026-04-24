import { upsertContactAction } from "@/app/actions";
import { cooperationLevelOptions } from "@/lib/contacts/cooperation";

type Option = {
  id: string;
  name: string;
};

type ContactFormProps = {
  mode: "create" | "edit";
  options: {
    categories: Option[];
    owners: Option[];
  };
  initialValues?: {
    id: string;
    name: string;
    company: string;
    jobTitle: string;
    email: string;
    phone: string;
    website: string;
    address: string;
    city: string;
    country: string;
    cooperationLevel: string;
    categoryId: string;
    ownerStaffId: string;
    isInfluencer: boolean;
    isMedia: boolean;
    contactStatus: string;
    sourceType: string;
    tags: string[];
  };
};

export function ContactForm({ mode, options, initialValues }: ContactFormProps) {
  return (
    <form action={upsertContactAction} className="space-y-6" encType="multipart/form-data">
      <input type="hidden" name="contactId" defaultValue={initialValues?.id ?? ""} />
      <input
        type="hidden"
        name="redirectTo"
        value={mode === "create" ? "/cards/:id" : `/cards/${initialValues?.id ?? ""}`}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-700">이름</span>
          <input
            name="name"
            required
            defaultValue={initialValues?.name ?? ""}
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-700">기관</span>
          <input
            name="company"
            defaultValue={initialValues?.company ?? ""}
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-700">직책</span>
          <input
            name="jobTitle"
            defaultValue={initialValues?.jobTitle ?? ""}
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-700">이메일</span>
          <input
            name="email"
            type="email"
            defaultValue={initialValues?.email ?? ""}
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-700">전화번호</span>
          <input
            name="phone"
            defaultValue={initialValues?.phone ?? ""}
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-700">웹사이트/소셜</span>
          <input
            name="website"
            defaultValue={initialValues?.website ?? ""}
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-700">도시</span>
          <input
            name="city"
            defaultValue={initialValues?.city ?? ""}
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-700">국가</span>
          <input
            name="country"
            defaultValue={initialValues?.country ?? "Brazil"}
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-700">문화원 협력 수위/주요도</span>
          <select
            name="cooperationLevel"
            defaultValue={initialValues?.cooperationLevel ?? ""}
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
          >
            <option value="">선택 안 함</option>
            {cooperationLevelOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm md:col-span-2">
          <span className="font-medium text-slate-700">주소</span>
          <input
            name="address"
            defaultValue={initialValues?.address ?? ""}
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-700">카테고리</span>
          <select
            name="categoryId"
            defaultValue={initialValues?.categoryId ?? ""}
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
          >
            <option value="">선택 안 함</option>
            {options.categories.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-700">담당자</span>
          <select
            name="ownerStaffId"
            defaultValue={initialValues?.ownerStaffId ?? ""}
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
          >
            <option value="">선택 안 함</option>
            {options.owners.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-700">연락처 상태</span>
          <select
            name="contactStatus"
            defaultValue={initialValues?.contactStatus ?? "active"}
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
          >
            <option value="active">active</option>
            <option value="vip">vip</option>
            <option value="inactive">inactive</option>
            <option value="needs_followup">needs_followup</option>
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-700">주 출처</span>
          <select
            name="sourceType"
            defaultValue={initialValues?.sourceType ?? "manual"}
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
          >
            <option value="manual">manual</option>
            <option value="legacy">legacy</option>
            <option value="ocr">ocr</option>
            <option value="merged">merged</option>
          </select>
        </label>
      </div>

      <p className="text-xs leading-6 text-slate-500">
        담당자를 비워 두면 현재 로그인한 사용자 기준으로 자동 연결됩니다. 저장/수정 이력도
        로그인 계정으로 기록됩니다. 협력 수위는 `★ / ★★ / ★★★` 기준으로 통일합니다.
      </p>

      <label className="block space-y-2 text-sm">
        <span className="font-medium text-slate-700">태그</span>
        <textarea
          name="tags"
          rows={4}
          defaultValue={initialValues?.tags.join(", ") ?? ""}
          placeholder="예: 우선초청, 핵심협력, 언론, 인플루언서, 브라질문화, 상파울루, 행사초청, 후속필요, 대사관, 기업협력"
          className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
        />
      </label>

      <label className="block space-y-2 text-sm">
        <span className="font-medium text-slate-700">프로필 사진</span>
        <input
          type="file"
          name="profilePhoto"
          accept="image/*"
          className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
        />
        <p className="text-xs leading-6 text-slate-500">
          새 사람을 추가하면서 바로 사진을 넣을 수 있고, 수정 화면에서는 새 파일로 교체됩니다.
        </p>
      </label>

      <div className="flex flex-wrap gap-6 text-sm text-slate-700">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            name="isInfluencer"
            defaultChecked={initialValues?.isInfluencer ?? false}
          />
          인플루언서
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            name="isMedia"
            defaultChecked={initialValues?.isMedia ?? false}
          />
          언론
        </label>
      </div>

      <button
        type="submit"
        className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
      >
        {mode === "create" ? "연락처 저장" : "연락처 수정 저장"}
      </button>
    </form>
  );
}
