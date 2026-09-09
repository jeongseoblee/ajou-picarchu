export type MemberRole = "member" | "executive" | "admin";
export type MemberStatus = "pending" | "approved" | "rejected" | "suspended";
export type PostType = "notice" | "activity" | "project";

export interface Profile {
  id: string;
  email: string;
  name: string;
  student_id: string;
  department: string;
  grade: number | null;
  phone: string | null;
  role: MemberRole;
  status: MemberStatus;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  type: PostType;
  title: string;
  content: string;
  author_id: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface PostAttachment {
  id: string;
  post_id: string;
  storage_path: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  storage_path: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  download_count: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DownloadLog {
  id: number;
  user_id: string;
  file_id: string;
  downloaded_at: string;
}

export const POST_TYPE_LABEL: Record<PostType, string> = {
  notice: "공지사항",
  activity: "활동",
  project: "프로젝트",
};
export const POST_TYPE_PATH: Record<PostType, string> = {
  notice: "/notice",
  activity: "/activities",
  project: "/projects",
};
export const ROLE_LABEL: Record<MemberRole, string> = {
  member: "회원",
  executive: "임원",
  admin: "관리자",
};
export const STATUS_LABEL: Record<MemberStatus, string> = {
  pending: "승인 대기",
  approved: "승인",
  rejected: "거절",
  suspended: "정지",
};
