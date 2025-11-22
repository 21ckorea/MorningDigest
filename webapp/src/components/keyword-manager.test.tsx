import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { KeywordManager } from "./keyword-manager";

const mockKeyword = {
  id: "kw-test",
  word: "테스트 키워드",
  priority: "high" as const,
  createdAt: "2025-11-22",
  volume: "—",
};

describe("KeywordManager", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockKeyword }),
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders default metrics", () => {
    render(<KeywordManager />);

    expect(
      screen.getByRole("heading", { name: /키워드 & 그룹 관리/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/등록 키워드/i)).toBeInTheDocument();
    expect(screen.getByText(/활성 그룹/i)).toBeInTheDocument();
  });

  it("adds a new keyword via modal form", async () => {
    render(<KeywordManager initialKeywords={[]} initialGroups={[]} />);

    await user.click(screen.getByRole("button", { name: /키워드 추가/i }));

    const modal = screen.getByRole("dialog");
    await user.type(within(modal).getByLabelText("키워드명"), mockKeyword.word);
    await user.selectOptions(
      within(modal).getByLabelText("우선순위"),
      "high"
    );

    await user.click(within(modal).getByRole("button", { name: /추가/ }));

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/keywords",
      expect.objectContaining({ method: "POST" })
    );

    expect(await screen.findByText(mockKeyword.word)).toBeInTheDocument();
    const priorityBadge = screen.getByText("높음");
    expect(priorityBadge).toBeInTheDocument();
  });
});
