import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Markdown 렌더러. react-markdown 은 기본적으로 raw HTML 을 렌더링하지 않으므로
 * 사용자 입력 HTML 이 그대로 출력되지 않는다 (XSS 방지).
 */
export function Markdown({ content, className = "" }: { content: string; className?: string }) {
  return (
    <div className={`prose-doc ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children }) => {
            const safe = href && /^(https?:\/\/|mailto:|\/)/i.test(href) ? href : undefined;
            return (
              <a href={safe} target={safe?.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
