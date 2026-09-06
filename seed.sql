-- Sample questions for local testing — run after schema.sql.
-- Replace with real question-bank content before launch.

insert into questions (section, topic, question_type, difficulty, prompt, choices, correct_choice, explanation, source)
values
  ('quant', 'algebra', 'problem_solving', 2,
   'If 3x + 7 = 22, what is the value of x?',
   '[{"key":"A","text":"3"},{"key":"B","text":"5"},{"key":"C","text":"7"},{"key":"D","text":"9"},{"key":"E","text":"15"}]',
   'B', '3x = 15, so x = 5.', 'original'),

  ('quant', 'algebra', 'problem_solving', 4,
   'If x^2 - 5x + 6 = 0, what is the sum of all possible values of x?',
   '[{"key":"A","text":"1"},{"key":"B","text":"5"},{"key":"C","text":"6"},{"key":"D","text":"-5"},{"key":"E","text":"11"}]',
   'B', 'Roots are 2 and 3 (factors of 6 summing via -b/a = 5), so the sum is 5.', 'original'),

  ('verbal', 'critical_reasoning', 'weaken', 3,
   'A city plans to reduce traffic congestion by adding a new bus lane. Critics argue this will worsen congestion by removing a lane for cars. Which finding, if true, would most weaken the critics'' argument?',
   '[{"key":"A","text":"The city has added bus lanes before with no effect."},{"key":"B","text":"Bus ridership on the new route is projected to remove 2,000 cars per day from the road."},{"key":"C","text":"The bus lane will be repainted every two years."},{"key":"D","text":"Other cities have wider roads than this city."},{"key":"E","text":"The buses will run every 15 minutes."}]',
   'B', 'If enough drivers switch to the bus, the net effect on congestion could be positive despite one fewer car lane — directly undercutting the critics'' assumption.', 'original'),

  ('data_insights', 'data_sufficiency', 'data_sufficiency', 3,
   'Is x > 0? (1) x^2 > 0  (2) x^3 > 0',
   '[{"key":"A","text":"Statement (1) alone is sufficient"},{"key":"B","text":"Statement (2) alone is sufficient"},{"key":"C","text":"Both together are sufficient, neither alone"},{"key":"D","text":"Each alone is sufficient"},{"key":"E","text":"Together not sufficient"}]',
   'B', 'x^2 > 0 only rules out x = 0 (true for negatives too). x^3 > 0 implies x > 0 directly.', 'original');
