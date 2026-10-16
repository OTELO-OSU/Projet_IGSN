import {
  BotIcon,
  EyeIcon,
  FilePlusIcon,
  GitForkIcon,
  InfoIcon,
  KeyRoundIcon,
  type LucideIcon,
  QuoteIcon,
} from "lucide-react";

import { m } from "#/paraglide/messages.js";

export type FaqList = { ordered: boolean; items: string[] };

export type FaqQuestion = {
  value: string;
  title: string;
  answer: (string | FaqList)[];
};

export type FaqCategory = {
  slug: string;
  title: string;
  icon: LucideIcon;
  questions: FaqQuestion[];
};

export function faqCategories(): FaqCategory[] {
  return [
    {
      slug: "general",
      title: m.faq_category_general(),
      icon: InfoIcon,
      questions: [
        {
          value: "igsn",
          title: m.faq_igsn_title(),
          answer: [m.faq_igsn_answer()],
        },
        {
          value: "application",
          title: m.faq_application_title(),
          answer: [m.faq_application_answer()],
        },
        {
          value: "audience",
          title: m.faq_audience_title(),
          answer: [m.faq_audience_answer_1(), m.faq_audience_answer_2()],
        },
        {
          value: "sesar",
          title: m.faq_sesar_title(),
          answer: [m.faq_sesar_answer()],
        },
        {
          value: "price",
          title: m.faq_price_title(),
          answer: [m.faq_price_answer()],
        },
      ],
    },
    {
      slug: "account",
      title: m.faq_category_account(),
      icon: KeyRoundIcon,
      questions: [
        {
          value: "sign-in",
          title: m.faq_sign_in_title(),
          answer: [m.faq_sign_in_answer()],
        },
        {
          value: "orcid",
          title: m.faq_orcid_title(),
          answer: [m.faq_orcid_answer()],
        },
        {
          value: "sign-in-trouble",
          title: m.faq_sign_in_trouble_title(),
          answer: [m.faq_sign_in_trouble_answer()],
        },
        {
          value: "sharing",
          title: m.faq_sharing_title(),
          answer: [m.faq_sharing_answer()],
        },
      ],
    },
    {
      slug: "registration",
      title: m.faq_category_registration(),
      icon: FilePlusIcon,
      questions: [
        {
          value: "object-types",
          title: m.faq_object_types_title(),
          answer: [m.faq_object_types_answer()],
        },
        {
          value: "required-metadata",
          title: m.faq_required_metadata_title(),
          answer: [
            m.faq_required_metadata_answer_1(),
            m.faq_required_metadata_answer_2(),
          ],
        },
        {
          value: "batch-import",
          title: m.faq_batch_import_title(),
          answer: [m.faq_batch_import_answer()],
        },
        {
          value: "reservation",
          title: m.faq_reservation_title(),
          answer: [m.faq_reservation_answer()],
        },
        {
          value: "igsn-format",
          title: m.faq_igsn_format_title(),
          answer: [m.faq_igsn_format_answer()],
        },
        {
          value: "own-igsn",
          title: m.faq_own_igsn_title(),
          answer: [m.faq_own_igsn_answer()],
        },
        {
          value: "cannot-publish",
          title: m.faq_cannot_publish_title(),
          answer: [
            m.faq_cannot_publish_answer_1(),
            {
              ordered: false,
              items: [
                m.faq_cannot_publish_item_1(),
                m.faq_cannot_publish_item_2(),
                m.faq_cannot_publish_item_3(),
              ],
            },
            m.faq_cannot_publish_answer_2(),
          ],
        },
      ],
    },
    {
      slug: "relations",
      title: m.faq_category_relations(),
      icon: GitForkIcon,
      questions: [
        {
          value: "sub-samples",
          title: m.faq_sub_samples_title(),
          answer: [
            m.faq_sub_samples_answer(),
            {
              ordered: false,
              items: [
                m.faq_sub_samples_item_1(),
                m.faq_sub_samples_item_2(),
                m.faq_sub_samples_item_3(),
              ],
            },
          ],
        },
        {
          value: "foreign-parent",
          title: m.faq_foreign_parent_title(),
          answer: [
            m.faq_foreign_parent_answer_1(),
            {
              ordered: false,
              items: [
                m.faq_foreign_parent_item_1(),
                m.faq_foreign_parent_item_2(),
              ],
            },
            m.faq_foreign_parent_answer_2(),
          ],
        },
      ],
    },
    {
      slug: "visibility",
      title: m.faq_category_visibility(),
      icon: EyeIcon,
      questions: [
        {
          value: "public-metadata",
          title: m.faq_public_metadata_title(),
          answer: [m.faq_public_metadata_answer()],
        },
        {
          value: "editing",
          title: m.faq_editing_title(),
          answer: [m.faq_editing_answer()],
        },
        {
          value: "deletion",
          title: m.faq_deletion_title(),
          answer: [m.faq_deletion_answer()],
        },
      ],
    },
    {
      slug: "usage",
      title: m.faq_category_usage(),
      icon: QuoteIcon,
      questions: [
        {
          value: "find-by-igsn",
          title: m.faq_find_by_igsn_title(),
          answer: [m.faq_find_by_igsn_answer()],
        },
        {
          value: "search",
          title: m.faq_search_title(),
          answer: [
            {
              ordered: true,
              items: [
                m.faq_search_step_words(),
                m.faq_search_step_location(),
                m.faq_search_step_filters(),
                m.faq_search_step_map(),
              ],
            },
          ],
        },
        {
          value: "search-rules",
          title: m.faq_search_rules_title(),
          answer: [
            {
              ordered: false,
              items: [
                m.faq_search_rule_fields(),
                m.faq_search_rule_case(),
                m.faq_search_rule_typo(),
                m.faq_search_rule_wildcard(),
                m.faq_search_rule_phrase(),
                m.faq_search_rule_operators(),
                m.faq_search_rule_limits(),
                m.faq_search_rule_area(),
                m.faq_search_rule_published(),
              ],
            },
          ],
        },
        {
          value: "citation",
          title: m.faq_citation_title(),
          answer: [m.faq_citation_answer()],
        },
        {
          value: "collection-citation",
          title: m.faq_collection_citation_title(),
          answer: [
            m.faq_collection_citation_answer_1(),
            m.faq_collection_citation_answer_2(),
            m.faq_collection_citation_answer_3(),
            m.faq_collection_citation_answer_4(),
            m.faq_collection_citation_answer_5(),
          ],
        },
        {
          value: "labels",
          title: m.faq_labels_title(),
          answer: [m.faq_labels_answer()],
        },
        {
          value: "api",
          title: m.faq_api_title(),
          answer: [m.faq_api_answer()],
        },
        {
          value: "missing-term",
          title: m.faq_missing_term_title(),
          answer: [m.faq_missing_term_answer()],
        },
      ],
    },
    {
      slug: "service-accounts",
      title: m.faq_category_service_accounts(),
      icon: BotIcon,
      questions: [
        {
          value: "service-account-purpose",
          title: m.faq_service_account_purpose_title(),
          answer: [m.faq_service_account_purpose_answer()],
        },
        {
          value: "service-account-difference",
          title: m.faq_service_account_difference_title(),
          answer: [m.faq_service_account_difference_answer()],
        },
        {
          value: "service-account-request",
          title: m.faq_service_account_request_title(),
          answer: [
            m.faq_service_account_request_answer_1(),
            {
              ordered: false,
              items: [
                m.faq_service_account_request_item_1(),
                m.faq_service_account_request_item_2(),
                m.faq_service_account_request_item_3(),
              ],
            },
            m.faq_service_account_request_answer_2(),
          ],
        },
        {
          value: "service-account-responsibilities",
          title: m.faq_service_account_responsibilities_title(),
          answer: [m.faq_service_account_responsibilities_answer()],
        },
      ],
    },
  ];
}
