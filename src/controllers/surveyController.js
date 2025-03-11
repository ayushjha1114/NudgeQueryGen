import { createPostgresClient } from '../config.js';

export const surveySqlController = async (req, res) => {
    const { db_name } = req.body;

    if (!db_name) {
        return res.status(400).send("Database name is required.");
    }

    try {
        const client = createPostgresClient(db_name);
        await client.connect();
        console.log(`Connected to PostgreSQL database: ${db_name}`);
        const payload = req.body;

        const queries = await generateSql(payload, client);

        res.type('text/plain');
        res.status(200).send(queries);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

async function generateSql(payload, client) {
    try {
        const { survey, section, options, questions, survey_reference_id, conditions_for, question_conditions } = payload;
        const conditionMapWithid = [{ name: "Date of completion", id: 595 }, { name: "Date of Birth", id: 936 }];

        const surveyQuery = 'SELECT id FROM public.surveys ORDER BY id DESC LIMIT 1';
        const sectionQuery = 'SELECT id FROM public.sections ORDER BY id DESC LIMIT 1';
        const optionQuery = 'SELECT id FROM public.options ORDER BY id DESC LIMIT 1';
        const questionQuery = 'SELECT id FROM public.questions ORDER BY id DESC LIMIT 1';
        const surveyReferenceQuery = 'SELECT id FROM public.survey_reference ORDER BY id DESC LIMIT 1';
        const surveySectionQuery = 'SELECT id FROM public.survey_section ORDER BY id DESC LIMIT 1';
        const conditionalQuestionMappingQuery = 'SELECT id FROM public.conditional_question_mapping ORDER BY id DESC LIMIT 1';
        const conditionQuery = 'SELECT id FROM public.conditions ORDER BY id DESC LIMIT 1';
        const languageReferenceQuery = 'SELECT id FROM public.language_reference ORDER BY id DESC LIMIT 1';
        const questionOptionQuery = 'SELECT id FROM public.question_options ORDER BY id DESC LIMIT 1';
        const section_questionQuery = 'SELECT id FROM public.section_question ORDER BY id DESC LIMIT 1';

        const [
            surveyRow,
            sectionRow,
            optionRow,
            questionRow,
            surveyReferenceRow,
            surveySectionRow,
            conditionalQuestionMappingRow,
            conditionRow,
            languageReferenceRow,
            questionOptionRow,
            section_questionRow
        ] = await Promise.all([
            client.query(surveyQuery),
            client.query(sectionQuery),
            client.query(optionQuery),
            client.query(questionQuery),
            client.query(surveyReferenceQuery),
            client.query(surveySectionQuery),
            client.query(conditionalQuestionMappingQuery),
            client.query(conditionQuery),
            client.query(languageReferenceQuery),
            client.query(questionOptionQuery),
            client.query(section_questionQuery)
        ]);

        const surveyId = (parseInt(surveyRow.rows[0]?.id) || 0) + 1;

        const sectionIdStart = (parseInt(sectionRow.rows[0]?.id)) + 1;
        const optionIdStart = (parseInt(optionRow.rows[0]?.id)) + 1;
        const questionIdStart = (parseInt(questionRow.rows[0]?.id)) + 1;
        const surveyReferenceIdStart = (parseInt(surveyReferenceRow.rows[0]?.id)) + 1;
        const surveySectionIdStart = (parseInt(surveySectionRow.rows[0]?.id)) + 1;
        const conditionIdStart = (parseInt(conditionRow.rows[0]?.id)) + 1;
        const languageReferenceIdStart = (parseInt(languageReferenceRow.rows[0]?.id)) + 1;
        const questionOptionIdStart = (parseInt(questionOptionRow.rows[0]?.id)) + 1;
        const sectionQuestionIdStart = (parseInt(section_questionRow.rows[0]?.id)) + 1;

        // for Surveys
        const surveyQueries = survey.map((surveyName, index) => {
            const surveyIdCurrent = surveyId + index;
            return `
                INSERT INTO surveys (id, name, created_by, created_date, modified_by, modified_date, status)
                VALUES (${surveyIdCurrent}, '${surveyName}', 1, now(), 1, now(), 1);
            `;
        });

        // for Sections
        const sectionArray = [];
        const sectionQueries = section.map((sectionName, index) => {
            const sectionIdCurrent = sectionIdStart + index;
            sectionArray.push(sectionIdCurrent);
            return `
                INSERT INTO sections (id, name, image_url, created_by, created_date, modified_by, modified_date, status)
                VALUES (${sectionIdCurrent}, '${sectionName}', '', 1, now(), 1, now(), 1);
            `;
        });

        // for Options
        const optionArray = [];
        const optionQueries = options.map((option, index) => {
            const optionIdCurrent = optionIdStart + index;
            optionArray.push(optionIdCurrent);
            return `
                INSERT INTO options (id, name, type, image_url, created_by, created_date, modified_by, modified_date, status)
                VALUES (${optionIdCurrent}, '${option.name}', '${option.type}', '', 1, now(), 1, now(), 1);
            `;
        });

        // for Questions
        const questionsArray = [];
        const questionQueries = questions.map((question, index) => {
            const questionIdCurrent = questionIdStart + index;
            questionsArray.push({ id: questionIdCurrent, name: question.name });
            return `
                INSERT INTO questions (id, name, image_url, type, created_by, created_date, modified_by, modified_date, status)
                VALUES (${questionIdCurrent}, '${question.name}', '', '${question.type}', 1, now(), 1, now(), 1);
            `;
        });

        // for Survey References
        let currentSurveyRefId = surveyReferenceIdStart;
        let surveyReferenceIdList = [];
        const surveyReferenceQueries = survey.map((_, index) => {
            const surveyIdCurrent = surveyId + index;
            const result = survey_reference_id.map((surveyReferenceId) => {
                const query = `
                INSERT INTO survey_reference (id, survey_id, reference_id, reference_type, doer, reviewer, subject, start_date, end_date, publish, created_by, created_date, modified_by, modified_date, status, validation_config_id)
                VALUES (${currentSurveyRefId}, ${surveyIdCurrent}, ${surveyReferenceId}, 'STATE', 'UPCM', 'BPC', 'Didi', now(), now(), true, 1, now(), 1, now(), 1, null);
            `;
                surveyReferenceIdList.push(currentSurveyRefId);
                currentSurveyRefId++;
                return query;
            })
            return result;
        });
        // console.log(surveyReferenceQueries.flat().join(' ,\n'));

        // for Survey Sections
        let sectionIdCurrent = sectionIdStart;
        const surveySectionQueries = surveyReferenceIdList.map((surveyRefId, index) => {
            const surveySectionIdCurrent = surveySectionIdStart + index;
            if (index % 2 === 0 && index !== 0) {
                sectionIdCurrent++; // Increment section_id every two iterations
            }
            return `
                INSERT INTO survey_section (id, survey_reference_id, section_id, order_no, created_by, created_date, modified_by, modified_date, status)
                VALUES (${surveySectionIdCurrent}, ${surveyRefId + index}, ${sectionIdCurrent}, 1, 1, now(), 1, now(), 1);
            `;
        });

        // for Section Questions
        let sectionQuestionQueries = [];
        let sectionQuestionId = sectionQuestionIdStart;
        questionsArray.forEach((question, index) => {
            sectionQuestionQueries.push(`
                INSERT INTO section_question(
                    id, section_id, question_id, order_number, conditional, mandatory, created_by, created_date, modified_by, modified_date, status)
                VALUES (${sectionQuestionId}, ${sectionArray[index]}, ${question.id}, 1, false, true, 1, now(), 1, now(), 1);
            `);
            sectionQuestionId++;
        });

        // for Section Questions with conditions
        if (question_conditions && question_conditions.length > 0) {
            question_conditions.forEach((condition, conditionIndex) => {
                if (questionsArray.filter((question) => question.name === condition.name).length > 0) {
                    const questionIndex = questionsArray.findIndex((question) => question.name === condition.name);
                    const sectionIdForCondition = sectionArray[questionIndex];
                    const conditionQuestionId = conditionMapWithid.find((conditionItem) => conditionItem.name === condition.type)?.id;
                    if (conditionQuestionId) {
                        sectionQuestionQueries.push(`
                            INSERT INTO section_question(
                            id, section_id, question_id, order_number, conditional, mandatory, created_by, created_date, modified_by, modified_date, status)
                            VALUES (${sectionQuestionId}, ${sectionIdForCondition}, ${conditionQuestionId}, 2, false, true, 1, now(), 1, now(), 1);
                        `);
                        sectionQuestionId++;
                    }
                }
            });
        }

        // for Question Options
        let questionOptionsQueries = [];
        let questionOptionId = questionOptionIdStart;
        questionsArray.forEach((question, index) => {
            optionArray.forEach((optionid, optionIndex) => {
                questionOptionsQueries.push(`
                    INSERT INTO question_options(
                        id, question_id, option_id, order_no, score, conditional, created_by, created_date, modified_by, modified_date, status)
                    VALUES (${questionOptionId}, ${question.id}, ${optionid}, ${optionIndex + 1}, 1, false, 1, now(), 1, now(), 1);
                `);
                questionOptionId++;
            });
        });

        // for Conditional Question Mapping and Conditions (only if condition exists)
        let conditionalQueries = [];
        if (question_conditions && question_conditions.length > 0) {
            const conditionalQuestionMappingIdStart = parseInt(conditionalQuestionMappingRow.rows[0]?.id) + 1;
            question_conditions.forEach((condition, index) => {
                const conditionalQuestionMappingId = conditionalQuestionMappingIdStart + index;
                const conditionId = conditionIdStart + index;
                const conditionQuestionId = conditionMapWithid.filter((conditionItem) => conditionItem.name === condition.type)[0].id;
                const source_question_id = questionsArray.filter((question) => question.name === condition.name)[0].id;
                conditionalQueries.push(`
                    INSERT INTO conditional_question_mapping (id, source_question, target_question, conditionaloperator, created_by, created_date, modified_by, modified_date, status)
                    VALUES (${conditionalQuestionMappingId}, ${source_question_id}, ${conditionQuestionId}, null, 1, now(), 1, now(), 1);
                `);
                conditionalQueries.push(`
                    INSERT INTO public.conditions (id, conditional_question_mapping_id, condition, created_by, created_date, modified_by, modified_date, status)
                    VALUES (${conditionId}, ${conditionalQuestionMappingId}, '@? = 936', 1 , now(), 1, now(), 1);
                `);

            });
        }

        // for Language References
        const languageReferenceQueries = [
            ...survey.map((surveyName, index) => {
                return `
                    INSERT INTO language_reference (language_code, description, paraphrase, reference_id, reference_type, created_by, created_date, modified_by, modified_date, status)
                    VALUES ('en', '${surveyName}', '', ${surveyId + index}, 'SURVEY', 1, now(), 1, now(), 1);
                `;
            }),
            ...section.map((sectionName, index) => {
                return `
                    INSERT INTO language_reference (language_code, description, paraphrase, reference_id, reference_type, created_by, created_date, modified_by, modified_date, status)
                    VALUES ('en', '${sectionName}', '', ${sectionIdStart + index}, 'SECTION', 1, now(), 1, now(), 1);
                `;
            }),
            ...questions.map((question, index) => {
                return `
                    INSERT INTO language_reference (language_code, description, paraphrase, reference_id, reference_type, created_by, created_date, modified_by, modified_date, status)
                    VALUES ('en', '${question.name}', '', ${questionIdStart + index}, 'QUESTION', 1, now(), 1, now(), 1);
                `;
            }),
            ...options.map((option, index) => {
                return `
                    INSERT INTO language_reference (language_code, description, paraphrase, reference_id, reference_type, created_by, created_date, modified_by, modified_date, status)
                    VALUES ('en', '${option.name}', '', ${optionIdStart + index}, 'OPTION', 1, now(), 1, now(), 1);
                `;
            })
        ];

        const allQueries = [
            ...surveyQueries,
            ...sectionQueries,
            ...optionQueries,
            ...questionQueries,
            ...surveyReferenceQueries,
            ...surveySectionQueries,
            ...sectionQuestionQueries,
            ...questionOptionsQueries,
            ...conditionalQueries,
            ...languageReferenceQueries
        ].join("\n");

        return allQueries;
    } catch (err) {
        throw new Error(`Error in SQL queries: ${err.message}`);
    }
}

export default surveySqlController;
