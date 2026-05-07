export const mockDocument = {
    document_id: 'mock-doc-001',
    filename: 'sample-judgment.pdf',
}

export const mockExtractedItems = [
    {
        item_id: 'mock-1',
        action: 'Issue written compliance order',
        next_step:
            'Issue written order to Judicial Administration. Submit compliance evidence within reasonable time.',
        type: 'COMPLY',
        direction:
            'The respondent authority shall comply with the directions issued by this Court.',
        department: 'Judicial Administration',
        deadline: 'Immediate',
        exact_deadline_date: '2026-04-28',
        days_remaining: 1,
        priority: 'HIGH',
        confidence: 0.95,
        risk: 'Failure may trigger contempt proceedings.',
        source_snippet:
            'The respondent authority shall comply with the directions issued by this Court.',
        page_number: 1,
        status: 'pending',
    },

    {
        item_id: 'mock-2',
        action: 'Release court-awarded compensation',
        next_step:
            'Issue written order to Finance Department. Submit compliance evidence within 7 days.',
        type: 'COMPLY',
        direction:
            'Compensation shall be released to the petitioner within the stipulated period.',
        department: 'Finance Department',
        deadline: 'Within 7 days',
        exact_deadline_date: '2026-05-02',
        days_remaining: 5,
        priority: 'MEDIUM',
        confidence: 0.89,
        risk: 'Delay may result in additional penalties.',
        source_snippet:
            'Compensation shall be released to the petitioner within the stipulated period.',
        page_number: 1,
        status: 'pending',
    },
]