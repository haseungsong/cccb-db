export type DemoContact = {
  id: string;
  name: string;
  company: string;
  category: string;
  ownerStaff: string;
  city: string;
  phone: string;
  email: string;
  isInfluencer?: boolean;
  imageUrl?: string;
  events: string[];
};

export const dashboardStats = [
  { label: "전체 연락처", value: "1,007+" },
  { label: "인플루언서", value: "48" },
  { label: "행사 시트", value: "17" },
  { label: "모바일 업로드", value: "실시간" },
];

export const demoContacts: DemoContact[] = [
  {
    id: "joao-silva",
    name: "João Silva",
    company: "Ação Comercial Ltda",
    category: "인플루언서",
    ownerStaff: "김민지",
    city: "São Paulo",
    phone: "+55 11 99999-0000",
    email: "joao@empresa.com.br",
    isInfluencer: true,
    imageUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
    events: ["COP30", "개막식(6.12)"],
  },
  {
    id: "marcia-lima",
    name: "Márcia Lima",
    company: "Canal Cultura SP",
    category: "언론인",
    ownerStaff: "박소연",
    city: "Rio de Janeiro",
    phone: "+55 21 98888-1111",
    email: "marcia@canalcultura.com.br",
    events: ["리우 영화의 날(6.14)"],
  },
  {
    id: "carlos-santos",
    name: "Carlos Santos",
    company: "Instituto Brasil Coreia",
    category: "주요기관인사",
    ownerStaff: "이주연",
    city: "Brasilia",
    phone: "+55 61 97777-2222",
    email: "carlos@ibc.org.br",
    events: ["2024 국경일 리셉션"],
  },
];

export const setupChecklist = [
  "Supabase 프로젝트 생성",
  "Storage 버킷 3개 생성",
  "Google Vision API 키 발급",
  "OpenAI API 키 발급",
  ".env.local 작성",
  "Vercel 프로젝트 연결",
];
