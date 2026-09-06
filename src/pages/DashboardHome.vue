<template>
    <transition ref="tableContainer" name="slide-fade" appear>
        <div v-if="$route.name === 'DashboardHome'">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h1 class="mb-0">
                    {{ $t("Quick Stats") }}
                </h1>
                <button class="btn btn-primary btn-sm" @click="generateAiReport" :disabled="aiReportLoading">
                    <font-awesome-icon icon="wand-magic-sparkles" class="me-1" />
                    {{ aiReportLoading ? $t("Generating...") : $t("Generate AI Report") }}
                </button>
            </div>

            <div class="shadow-box big-padding text-center mb-3">
                <div class="row">
                    <div class="col">
                        <h3>{{ $t("Up") }}</h3>
                        <span class="num cursor-pointer" :class="$root.stats.up === 0 && 'text-secondary'" @click="onQuickStatClick('up')">
                            {{ $root.stats.up }}
                        </span>
                    </div>
                    <div class="col">
                        <h3>{{ $t("Down") }}</h3>
                        <span class="num cursor-pointer" :class="$root.stats.down > 0 ? 'text-danger' : 'text-secondary'" @click="onQuickStatClick('down')">
                            {{ $root.stats.down }}
                        </span>
                    </div>
                    <div class="col">
                        <h3>{{ $t("Maintenance") }}</h3>
                        <span class="num cursor-pointer" :class="$root.stats.maintenance > 0 ? 'text-maintenance' : 'text-secondary'" @click="onQuickStatClick('maintenance')">
                            {{ $root.stats.maintenance }}
                        </span>
                    </div>
                    <div class="col">
                        <h3>{{ $t("Unknown") }}</h3>
                        <span class="num cursor-pointer text-secondary" @click="onQuickStatClick('unknown')">
                            {{ $root.stats.unknown }}
                        </span>
                    </div>
                    <div class="col">
                        <h3>{{ $t("pauseDashboardHome") }}</h3>
                        <span class="num cursor-pointer text-secondary" @click="onQuickStatClick('paused')">
                            {{ $root.stats.pause }}
                        </span>
                    </div>
                </div>
            </div>

            <div class="shadow-box table-shadow-box table-wrapper">
                <div class="mb-3 text-end">
                    <button
                        class="btn btn-sm btn-outline-danger"
                        :disabled="clearingAllEvents"
                        @click="clearAllEventsDialog"
                    >
                        {{ $t("Clear All Events") }}
                    </button>
                </div>
                <table class="table table-borderless table-hover">
                    <thead>
                        <tr>
                            <th v-if="showGroupColumn">{{ $t("Group Name") }}</th>
                            <th class="name-column">{{ $t("Name") }}</th>
                            <th>{{ $t("Status") }}</th>
                            <th>{{ $t("DateTime") }}</th>
                            <th>{{ $t("Message") }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="(beat, index) in displayedRecords"
                            :key="index"
                            :class="{ 'shadow-box': $root.windowWidth <= 550 }"
                        >
                            <td v-if="showGroupColumn">
                                <router-link
                                    v-if="getGroupName(beat.monitorID)"
                                    :to="`/dashboard/${getGroupId(beat.monitorID)}`"
                                >
                                    {{ getGroupName(beat.monitorID) }}
                                </router-link>
                                <span v-else class="text-secondary">—</span>
                            </td>
                            <td class="name-column">
                                <router-link :to="`/dashboard/${beat.monitorID}`">
                                    {{ $root.monitorList[beat.monitorID]?.name }}
                                </router-link>
                            </td>
                            <td><Status :status="beat.status" /></td>
                            <td :class="{ 'border-0': !beat.msg }"><Datetime :value="beat.time" /></td>
                            <td class="border-0">{{ beat.msg }}</td>
                        </tr>

                        <tr v-if="importantHeartBeatListLength === 0">
                            <td :colspan="tableColumnCount">
                                {{ $t("No important events") }}
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div class="d-flex justify-content-center kuma_pagination">
                    <pagination
                        v-model="page"
                        :records="importantHeartBeatListLength"
                        :per-page="perPage"
                        :options="paginationConfig"
                    />
                </div>
            </div>
        </div>
    </transition>
    <Confirm
        ref="confirmClearEvents"
        btn-style="btn-danger"
        :yes-text="$t('Yes')"
        :no-text="$t('No')"
        @yes="clearAllEvents"
    >
        {{ $t("clearAllEventsMsg") }}
    </Confirm>
    <div ref="aiReportModal" class="modal fade" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">{{ $t("Weekly AI Service Report") }}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" :aria-label="$t('Close')" />
                </div>
                <div class="modal-body">
                    <div v-if="aiReportLoading" class="text-center py-4">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">{{ $t("Loading...") }}</span>
                        </div>
                        <p class="mt-2">{{ $t("Generating...") }}</p>
                    </div>
                    <div v-else-if="aiReportError" class="alert alert-danger">
                        {{ aiReportError }}
                    </div>
                    <div v-else-if="aiReportResult" class="ai-report-content">
                        <div v-if="aiReportResult.warning" class="alert alert-warning">
                            {{ aiReportResult.warning }}
                        </div>
                        <div v-if="aiReportResult.data" class="mb-3">
                            <h6>{{ $t("Summary") }}</h6>
                            <ul>
                                <li>{{ $t("Total Monitors") }}: {{ aiReportResult.data.summary.totalMonitors }}</li>
                                <li>{{ $t("Average Uptime") }}: {{ aiReportResult.data.summary.avgUptime }}%</li>
                                <li>{{ $t("Total Down Events") }}: {{ aiReportResult.data.summary.totalDownEvents }}</li>
                            </ul>
                        </div>
                        <div v-if="aiReportResult.aiAnalysis" class="mt-3">
                            <h6>{{ $t("AI Analysis") }}</h6>
                            <div class="border rounded p-3 bg-light ai-analysis-html" v-html="aiAnalysisHtml" />
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">{{ $t("Close") }}</button>
                </div>
            </div>
        </div>
    </div>
    <router-view ref="child" />
</template>

<script>
import Status from "../components/Status.vue";
import Datetime from "../components/Datetime.vue";
import Pagination from "v-pagination-3";
import Confirm from "../components/Confirm.vue";
import axios from "axios";
import { Modal } from "bootstrap";
import { marked } from "marked";

export default {
    components: {
        Datetime,
        Status,
        Pagination,
        Confirm,
    },
    props: {
        calculatedHeight: {
            type: Number,
            default: 0,
        },
    },
    data() {
        return {
            page: 1,
            perPage: 25,
            initialPerPage: 25,
            paginationConfig: {
                hideCount: true,
                chunksNavigation: "scroll",
            },
            importantHeartBeatListLength: 0,
            displayedRecords: [],
            clearingAllEvents: false,
            aiReportLoading: false,
            aiReportResult: null,
            aiReportError: null,
        };
    },
    computed: {
        showGroupColumn() {
            return Object.values(this.$root.monitorList).some((m) => m.parent != null);
        },
        tableColumnCount() {
            return this.showGroupColumn ? 5 : 4;
        },
        aiAnalysisHtml() {
            if (!this.aiReportResult?.aiAnalysis) {
                return "";
            }
            return marked(this.aiReportResult.aiAnalysis);
        },
    },
    watch: {
        perPage() {
            this.$nextTick(() => {
                this.getImportantHeartbeatListPaged();
            });
        },

        page() {
            this.getImportantHeartbeatListPaged();
        },
    },

    mounted() {
        this.getImportantHeartbeatListLength();

        this.$root.emitter.on("newImportantHeartbeat", this.onNewImportantHeartbeat);

        this.initialPerPage = this.perPage;

        window.addEventListener("resize", this.updatePerPage);
        this.updatePerPage();

        this.aiReportModal = new Modal(this.$refs.aiReportModal);
    },

    beforeUnmount() {
        this.$root.emitter.off("newImportantHeartbeat", this.onNewImportantHeartbeat);

        window.removeEventListener("resize", this.updatePerPage);

        if (this.aiReportModal) {
            this.aiReportModal.dispose();
        }
    },

    methods: {
        /**
         * Emits a quick stats filter event when a stat is clicked.
         * @param {string} filterType - The type of filter to apply
         * @returns {void}
         */
        onQuickStatClick(filterType) {
            this.$root.emitter.emit("quickStatsFilter", filterType);
        },
        /**
         * Returns the group (parent) name for a monitor, or empty string if none.
         * @param {number} monitorID - The monitor ID.
         * @returns {string} The group name or empty string.
         */
        getGroupName(monitorID) {
            const monitor = this.$root.monitorList[monitorID];
            if (!monitor || monitor.parent == null) {
                return "";
            }
            const parent = this.$root.monitorList[monitor.parent];
            return parent ? parent.name : "";
        },

        /**
         * Returns the group (parent) ID for a monitor, or null if none.
         * @param {number} monitorID - The monitor ID.
         * @returns {number|null} The group monitor ID or null.
         */
        getGroupId(monitorID) {
            const monitor = this.$root.monitorList[monitorID];
            return monitor && monitor.parent != null ? monitor.parent : null;
        },

        /**
         * Updates the displayed records when a new important heartbeat arrives.
         * @param {object} heartbeat - The heartbeat object received.
         * @returns {void}
         */
        onNewImportantHeartbeat(heartbeat) {
            if (this.page === 1) {
                this.displayedRecords.unshift(heartbeat);
                if (this.displayedRecords.length > this.perPage) {
                    this.displayedRecords.pop();
                }
                this.importantHeartBeatListLength += 1;
            }
        },

        /**
         * Retrieves the length of the important heartbeat list for all monitors.
         * @returns {void}
         */
        getImportantHeartbeatListLength() {
            this.$root.getSocket().emit("monitorImportantHeartbeatListCount", null, (res) => {
                if (res.ok) {
                    this.importantHeartBeatListLength = res.count;
                    this.getImportantHeartbeatListPaged();
                }
            });
        },

        /**
         * Retrieves the important heartbeat list for the current page.
         * @returns {void}
         */
        getImportantHeartbeatListPaged() {
            const offset = (this.page - 1) * this.perPage;
            this.$root.getSocket().emit("monitorImportantHeartbeatListPaged", null, offset, this.perPage, (res) => {
                if (res.ok) {
                    this.displayedRecords = res.data;
                }
            });
        },

        /**
         * Updates the number of items shown per page based on the available height.
         * @returns {void}
         */
        updatePerPage() {
            const tableContainer = this.$refs.tableContainer;
            const tableContainerHeight = tableContainer.offsetHeight;
            const availableHeight = window.innerHeight - tableContainerHeight;
            const additionalPerPage = Math.floor(availableHeight / 58);

            if (additionalPerPage > 0) {
                this.perPage = Math.max(this.initialPerPage, this.perPage + additionalPerPage);
            } else {
                this.perPage = this.initialPerPage;
            }
        },

        clearAllEventsDialog() {
            this.$refs.confirmClearEvents.show();
        },
        clearAllEvents() {
            this.clearingAllEvents = true;
            const monitorIDs = Object.keys(this.$root.monitorList);
            let failed = 0;
            const total = monitorIDs.length;

            if (total === 0) {
                this.clearingAllEvents = false;
                this.$root.toastError(this.$t("No monitors found"));
                return;
            }

            monitorIDs.forEach((monitorID) => {
                this.$root.getSocket().emit("clearEvents", monitorID, (res) => {
                    if (!res || !res.ok) {
                        failed++;
                    }
                });
            });
            this.clearingAllEvents = false;
            this.page = 1;
            this.getImportantHeartbeatListLength();
            if (failed === 0) {
                this.$root.toastSuccess(this.$t("Events cleared successfully"));
            } else {
                this.$root.toastError(
                    this.$t("Could not clear events", {
                        failed,
                        total,
                    })
                );
            }
        },
        /**
         * Fetch the AI report from the backend and display it in a modal
         * @returns {Promise<void>}
         */
        async generateAiReport() {
            this.aiReportLoading = true;
            this.aiReportError = null;
            this.aiReportResult = null;

            try {
                const res = await axios.get("/api/ai-report");
                this.aiReportResult = res.data;
                this.aiReportModal.show();
            } catch (error) {
                this.aiReportError = error.message || this.$t("Failed to generate AI report");
                this.aiReportModal.show();
            } finally {
                this.aiReportLoading = false;
            }
        },
    },
};
</script>

<style lang="scss" scoped>
@import "../assets/vars";

.num {
    font-size: 30px;
    color: $primary;
    font-weight: bold;
    display: block;
}

.cursor-pointer {
    cursor: pointer;
}

.shadow-box {
    padding: 20px;
}

table {
    font-size: 14px;

    tr {
        transition: all ease-in-out 0.2ms;
    }

    @media (max-width: 550px) {
        table-layout: fixed;
        overflow-wrap: break-word;
    }
}

@media screen and (max-width: 1280px) {
    .name-column {
        min-width: 150px;
    }
}

@media screen and (min-aspect-ratio: 4/3) {
    .name-column {
        min-width: 200px;
    }
}

.table-wrapper {
    overflow-x: auto;
}

.ai-report-content {
    max-height: 60vh;
    overflow-y: auto;
}

.ai-analysis-html {
    h1, h2, h3, h4, h5, h6 {
        margin-top: 0.5rem;
        margin-bottom: 0.5rem;
        color: inherit;
    }

    p {
        margin-bottom: 0.5rem;
    }

    ul, ol {
        padding-left: 1.25rem;
        margin-bottom: 0.5rem;
    }

    li + li {
        margin-top: 0.25rem;
    }

    strong {
        font-weight: 600;
    }

    code {
        background-color: rgba(0, 0, 0, 0.1);
        padding: 0.15rem 0.3rem;
        border-radius: 0.25rem;
        font-size: 0.9em;
    }

    .dark & {
        background-color: $dark-bg2 !important;
        color: $dark-font-color;

        code {
            background-color: rgba(255, 255, 255, 0.1);
        }
    }
}
</style>
