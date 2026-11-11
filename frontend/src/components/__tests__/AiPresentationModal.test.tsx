import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AiPresentationModal } from '../lessons/AiPresentationModal';
import { aiAssistantApi, lessonPlanApi } from '@/api';
import type { LessonPlanDto } from '@/types';

// Mock API calls
vi.mock('@/api', () => ({
  aiAssistantApi: {
    generate: vi.fn(),
  },
  lessonPlanApi: {
    updatePresentation: vi.fn(),
  },
}));

describe('AiPresentationModal Component', () => {
  const sampleLesson: LessonPlanDto = {
    id: 101,
    title: 'Fon Neyman Kompyuter Arxitekturasi',
    subject: 'Web Full-Stack Development',
    gradeLevel: '8-sinf',
    topic: 'CPU va Xotira Iyerarxiyasi',
    durationMinutes: 80,
    status: 'PUBLISHED',
    presentationSlides: `# 🚀 1. Slayd Sarlavhasi
- Asosiy tezis va matn

> 🎙️ **Spiker izohi:** Darsni qiziqarli savol bilan boshlang.
---
# 🧠 2. Ikkinchi Slayd
- Kod bloki va tushunchalar
\`\`\`javascript
const score = 100;
\`\`\`
`,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders presentation slides in presenter mode with title and slide counter', () => {
    render(
      <AiPresentationModal
        isOpen={true}
        onClose={vi.fn()}
        lesson={sampleLesson}
      />
    );

    // Dialog title
    expect(screen.getByText('AI Maruza Taqdimoti')).toBeInTheDocument();
    // Slide counter
    expect(screen.getByText(/Slayd 1 \/ 2/i)).toBeInTheDocument();
    // Slide title
    expect(screen.getByText(/1\. Slayd Sarlavhasi/i)).toBeInTheDocument();
    // Speaker notes
    expect(screen.getByText(/Darsni qiziqarli savol bilan boshlang/i)).toBeInTheDocument();
  });

  it('navigates between slides on next and previous button clicks', () => {
    render(
      <AiPresentationModal
        isOpen={true}
        onClose={vi.fn()}
        lesson={sampleLesson}
      />
    );

    expect(screen.getByText(/Slayd 1 \/ 2/i)).toBeInTheDocument();

    // Click Next button
    const nextBtn = screen.getByRole('button', { name: /Keyingi/i });
    fireEvent.click(nextBtn);

    // Slide 2 is displayed
    expect(screen.getByText(/Slayd 2 \/ 2/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Ikkinchi Slayd/i)).toBeInTheDocument();

    // Click Oldingi button
    const prevBtn = screen.getByRole('button', { name: /Oldingi/i });
    fireEvent.click(prevBtn);

    // Slide 1 is displayed
    expect(screen.getByText(/Slayd 1 \/ 2/i)).toBeInTheDocument();
  });

  it('switches to Rich Text Editor tab and updates markdown content', () => {
    render(
      <AiPresentationModal
        isOpen={true}
        onClose={vi.fn()}
        lesson={sampleLesson}
      />
    );

    // Click editor tab
    const editorTabBtn = screen.getByRole('button', { name: /Rich Text Muharriri/i });
    fireEvent.click(editorTabBtn);

    expect(screen.getByText('Taqdimot Slaydlari Tahrirlovchisi (Markdown)')).toBeInTheDocument();

    // Textarea is present
    const textarea = screen.getByPlaceholderText(/Slaydlar matnini Markdown formatida kiriting/i);
    expect(textarea).toBeInTheDocument();
    expect((textarea as HTMLTextAreaElement).value).toContain('# 🚀 1. Slayd Sarlavhasi');
  });

  it('switches to AI Generator tab and triggers AI slide creation', async () => {
    const mockAiResponse = {
      data: {
        success: true,
        content: `# 🚀 1. Yangi AI Slaydi
- AI tomonidan yaratilgan tezis
---
# ⚡ 2. Amaliyot Slaydi
- Amaliy laboratoriya vazifasi
`,
      },
    };
    (aiAssistantApi.generate as any).mockResolvedValue(mockAiResponse);

    render(
      <AiPresentationModal
        isOpen={true}
        onClose={vi.fn()}
        lesson={sampleLesson}
      />
    );

    // Click AI Generator tab
    const aiTabBtn = screen.getByRole('button', { name: /AI bilan Yangilash/i });
    fireEvent.click(aiTabBtn);

    expect(screen.getByText(/Al-Xorazmiy Vorislari Bo‘yicha AI Taqdimot Generatori/i)).toBeInTheDocument();

    // Click generate button
    const generateBtn = screen.getByRole('button', { name: /AI bilan Maruza Taqdimotini Generatsiya Qilish/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(aiAssistantApi.generate).toHaveBeenCalledTimes(1);
    });
  });

  it('saves presentation slides to the lesson plan via API', async () => {
    const mockSaveResponse = {
      data: {
        ...sampleLesson,
        presentationSlides: sampleLesson.presentationSlides,
      },
    };
    (lessonPlanApi.updatePresentation as any).mockResolvedValue(mockSaveResponse);
    const mockSaveSuccess = vi.fn();

    render(
      <AiPresentationModal
        isOpen={true}
        onClose={vi.fn()}
        lesson={sampleLesson}
        onSaveSuccess={mockSaveSuccess}
      />
    );

    const saveBtn = screen.getByRole('button', { name: /Darsga Saqlash/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(lessonPlanApi.updatePresentation).toHaveBeenCalledWith(101, expect.any(String));
      expect(mockSaveSuccess).toHaveBeenCalled();
    });
  });
});
