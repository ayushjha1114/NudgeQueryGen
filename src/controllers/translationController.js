import fs from 'fs';
import { parse } from 'csv-parse';
import { createPostgresClient } from '../config.js';
import generateSql from '../services/surveyService.js';

const translationController = (req, res) => {
    try {
        const file = req.file;
        // console.warn("🚀 ~ translationController ~ file:", file)
        let rows = [];
        fs.createReadStream(file.path)
            .pipe(parse({ columns: true, trim: true }))
            .on('data', row => rows.push(row))
            .on('end', async () => {
                try {
                    const result = convertToSurveyJson(rows);
                    const client = createPostgresClient(result.db_name);
                    await client.connect();
                    console.log(`Connected to PostgreSQL database: ${result.db_name}`);
                    // console.warn("🚀 ~ .on ~ result:", result)

                    const { allQueries: queries, dbFetechedIds } = await generateSql(result, client);

                    const {
                        surveyId,
                        sectionIdStart,
                        optionIdStart,
                        questionIdStart,
                        surveyReferenceIdStart,
                        surveySectionIdStart,
                        conditionIdStart,
                        questionOptionIdStart,
                        sectionQuestionIdStart,
                        conditionalQuestionMappingIdStart,
                        tagIdStart
                    } = dbFetechedIds;

                    const {
                        ticket_number,
                        survey_primary_id,
                        section_primary_id,
                        option_primary_id,
                        question_primary_id,
                        survey_reference_primary_id,
                        survey_section_primary_id,
                        conditional_question_mapping_primary_id,
                        condition_primary_id,
                        question_option_primary_id,
                        section_question_primary_id,
                        tag_primary_id,
                        attributes
                    } = result;

                    const rawResponse = `
                        ${ticket_number ? `Ticket Number: ${ticket_number}` : ''}
                        survey_primary_id: ${survey_primary_id ? survey_primary_id.join(', ') : surveyId}
                        section_primary_id: ${section_primary_id ? section_primary_id.join(', ') : sectionIdStart}
                        option_primary_id: ${option_primary_id ? option_primary_id.join(', ') : optionIdStart}
                        question_primary_id: ${question_primary_id ? question_primary_id.join(', ') : questionIdStart}
                        survey_reference_primary_id: ${survey_reference_primary_id ? survey_reference_primary_id.join(', ') : surveyReferenceIdStart}
                        survey_section_primary_id: ${survey_section_primary_id ? survey_section_primary_id.join(', ') : surveySectionIdStart}
                        conditional_question_mapping_primary_id: ${conditional_question_mapping_primary_id ? conditional_question_mapping_primary_id.join(', ') : conditionalQuestionMappingIdStart}
                        condition_primary_id: ${condition_primary_id ? condition_primary_id.join(', ') : conditionIdStart}
                        question_option_primary_id: ${question_option_primary_id ? question_option_primary_id.join(', ') : questionOptionIdStart}
                        section_question_primary_id: ${section_question_primary_id ? section_question_primary_id.join(', ') : sectionQuestionIdStart}
                        tag_primary_id: ${tag_primary_id ? tag_primary_id : tagIdStart}
                        attributes: ${attributes ? attributes.map(attr => attr.id).join(', ') : ''}
            
                        Generated SQL Queries:
                        ${queries}
                    `;

                    res.type('text/plain');
                    // await client.end();
                    res.status(200).send(rawResponse);
                } catch (err) {
                    console.error('Error building JSON:', err);
                    res.status(500).json({ error: 'Failed to process CSV data.' });
                }
            })
            .on('error', err => {
                console.error('CSV parsing error:', err);
                res.status(500).json({ error: 'CSV file read error.' });
            });


    } catch (e) {
        console.error('Error:', e);
        res.status(500).json({ success: false, error: e.message });
    }
}

function convertToSurveyJson(records) {
    const surveyJson = {
        db_name: "dic_survey_engine_db",
        survey: [],
        section: [],
        options: [],
        questions: [],
        question_conditions: [],
        attributes: [],
        survey_reference_id: [],
        survey_primary_id: [],
        section_primary_id: [],
        option_primary_id: [],
        question_primary_id: [],
        survey_reference_primary_id: [],
        survey_section_primary_id: [],
        conditional_question_mapping_primary_id: [],
        condition_primary_id: [],
        question_option_primary_id: [],
        section_question_primary_id: []
    };

    let attributeId = records[0].attribute_primary_id;

    records.forEach((row, rowIndex) => {
        // Survey
        if (row.survey) {
            surveyJson.survey.push(row.survey);
        }

        // Section
        if (row.section) {
            surveyJson.section.push({
                name: row.section,
                section_seq: Number(row.section_seq)
            });
        }


        // Options
        if (row.options) {
            surveyJson.options.push({
                name: row.options,
                type: row.option_type || "",
                option_seq: Number(row.option_seq)
            });
        }

        // Questions
        if (row.questions) {
            const optionRefs = (row.question_option_ref || "").split(",").map(Number);

            const tag = {
                name: row.tag_name,
                parentId: row.tag_parentId && row.tag_parentName
                    ? {
                        name: row.tag_parentName,
                        parentId: parseInt(row.tag_parentId)
                    }
                    : null
            };

            surveyJson.questions.push({
                name: row.questions,
                type: row.question_type,
                section_ref: Number(row.question_section_ref),
                option_ref: optionRefs,
                tag
            });


            // Question conditions
            if (row.conditional === 'TRUE' || row.conditional === 'true') {
                surveyJson.question_conditions.push({
                    name: row.questions,
                    sourceQuestionName: row.conditional_source_question
                });
            }

            // Attributes
            if (row.attribute_name) {
                const attr = {
                    id: row.attribute_primary_id || attributeId++,
                    name: row.attribute_name,
                    type: "Static",
                    tag: row.tag_name
                };
                if (row.attribute_group_id) {
                    attr.attributeGroupId = parseInt(row.attribute_group_id);
                }
                surveyJson.attributes.push(attr);
            }
        }
    });

    surveyJson.survey_primary_id.push(Number(records[0].survey_primary_id));
    surveyJson.section_primary_id.push(Number(records[0].section_primary_id));
    surveyJson.option_primary_id.push(Number(records[0].option_primary_id));
    surveyJson.question_primary_id.push(Number(records[0].question_primary_id));
    surveyJson.survey_reference_id.push(Number(records[0].survey_reference_id) ? Number(records[0].survey_reference_id) : 0);
    surveyJson.survey_reference_primary_id.push(Number(records[0].survey_reference_primary_id));
    surveyJson.survey_section_primary_id.push(Number(records[0].survey_section_primary_id));
    surveyJson.conditional_question_mapping_primary_id.push(Number(records[0].conditional_question_mapping_primary_id));
    surveyJson.condition_primary_id.push(Number(records[0].condition_primary_id));
    surveyJson.question_option_primary_id.push(Number(records[0].question_option_primary_id));
    surveyJson.section_question_primary_id.push(Number(records[0].section_question_primary_id));
    surveyJson.tag_primary_id = Number(records[0].tag_primary_id) || null;


    return surveyJson;
}



export default translationController;