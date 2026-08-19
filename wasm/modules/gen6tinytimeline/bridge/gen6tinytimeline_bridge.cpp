/*
 * PokeRNGKit Gen VI Tiny Timeline WebAssembly bridge.
 * Adapted from 3DSRNGTool Gen6/TinyTimeline.cs, Controls/Frame_Tiny.cs,
 * Core/WildRNG.cs, Gen6/Horde.cs and Gen6/PokeRadar.cs.
 * Copyright (C) 2026 Hakuhiro. GPL-3.0-or-later.
 */
#include "gen6tinytimeline_bridge.h"

#include <algorithm>
#include <array>
#include <cstdint>
#include <limits>
#include <vector>

namespace {
constexpr std::uint32_t api_version = 1;
constexpr std::uint32_t max_frame = 1'000'000'000U;
constexpr std::uint32_t browser_max_results = 100'000U;

class TinyMT {
    std::array<std::uint32_t, 4> state{};
    static constexpr std::uint32_t mask = 0x7fffffffU;
    static constexpr std::uint32_t mat1 = 0x8f7011eeU;
    static constexpr std::uint32_t mat2 = 0xfc78ff1fU;
    static constexpr std::uint32_t tmat = 0x3793fdffU;

public:
    void set(const std::array<std::uint32_t, 4> &value) { state = value; }
    const std::array<std::uint32_t, 4> &current() const { return state; }
    std::uint32_t next() {
        step();
        auto t0 = state[3];
        auto t1 = state[0] + (state[2] >> 8);
        t0 ^= t1;
        if ((t1 & 1U) != 0) t0 ^= tmat;
        return t0;
    }
    void advance(std::uint32_t count) { while (count-- != 0) step(); }

private:
    void step() {
        auto y = state[3];
        auto x = (state[0] & mask) ^ state[1] ^ state[2];
        x ^= x << 1;
        y ^= (y >> 1) ^ x;
        state[0] = state[1];
        state[1] = state[2];
        state[2] = x ^ (y << 10);
        state[3] = y;
        if ((y & 1U) != 0) {
            state[1] ^= mat1;
            state[2] ^= mat2;
        }
    }
};

struct Event { std::uint32_t frame; std::uint32_t type; };
struct Status {
    TinyMT rng;
    std::int64_t frame = 0;
    std::vector<Event> events;

    void sort_events() {
        std::sort(events.begin(), events.end(), [](const Event &a, const Event &b) {
            return a.frame != b.frame ? a.frame > b.frame : a.type < b.type;
        });
    }
    void add(std::int64_t frame_value, std::uint32_t type) {
        events.push_back({static_cast<std::uint32_t>(std::max<std::int64_t>(0, frame_value)), type});
        sort_events();
    }
    void add_front(std::int64_t frame_value, std::uint32_t type) { events.push_back({static_cast<std::uint32_t>(std::max<std::int64_t>(0, frame_value)), type}); }
    void remove_fidget() {
        events.erase(std::remove_if(events.begin(), events.end(), [](const Event &e) { return e.type == 3; }), events.end());
    }
    std::uint32_t rand_n(std::uint32_t n) { return static_cast<std::uint32_t>((static_cast<std::uint64_t>(rng.next()) * n) >> 32); }
    std::uint32_t advance_to_next() {
        auto random = rng.next();
        if (events.empty()) return random;
        const auto event = events.back();
        events.pop_back();
        frame = event.frame;
        switch (event.type) {
        case 0: add_front(frame, random > 0x55555555U ? 1U : 2U); break;
        case 1: add(frame + static_cast<std::uint32_t>((static_cast<std::uint64_t>(random) * 60) >> 32) * 2U + 124U, 0); break;
        case 2: add(frame + (random > 0x55555555U ? 12U : 20U), 1); break;
        case 3: add(frame + static_cast<std::uint32_t>((static_cast<std::uint64_t>(random) * 90) >> 32) * 2U + 780U, 3); break;
        case 4: add(frame + (random % 3 == 0 ? 360U : 180U), 4); break;
        case 5: add(frame + 542U - static_cast<std::uint32_t>((static_cast<std::uint64_t>(random) * 180) >> 32) * 2U, 5); break;
        case 6: add(frame + 16, 6); break;
        case 7: add(frame + static_cast<std::uint32_t>(((static_cast<std::uint64_t>(random) * 10) >> 32) * 30 + 60), 7); break;
        default: break;
        }
        return random;
    }
    void elapse(std::int64_t delay) {
        const auto target = frame + delay;
        while (!events.empty() && events.back().frame < target) advance_to_next();
        frame = target;
    }
};

struct Span {
    std::uint32_t index = 0;
    std::uint32_t random = 0;
    std::int64_t frame_min = 0;
    std::int64_t frame_max = 0;
    std::array<std::uint32_t, 4> state{};
    std::vector<Event> events;
    std::uint32_t hit_index = 0;
};

thread_local std::vector<Gen6TinyTimelineResult> results;
thread_local std::uint32_t processed = 0;
thread_local std::uint32_t limit_reached = 0;
thread_local std::uint32_t error = 0;

std::uint32_t rand100(std::uint32_t random) { return static_cast<std::uint32_t>((static_cast<std::uint64_t>(random) * 100) >> 32); }
std::uint32_t slot_for(std::uint32_t value, std::uint32_t type) {
    static constexpr std::array<std::array<std::uint32_t, 12>, 55> distributions = [] {
        std::array<std::array<std::uint32_t, 12>, 55> all{};
        all[2] = {10, 10, 10, 10, 10, 10, 10, 10, 10, 5, 4, 1};
        all[3] = {60, 35, 5};
        all[4] = {50, 30, 15, 4, 1};
        all[49] = {50, 50};
        all[50] = {34, 33, 33};
        return all;
    }();
    if (type >= distributions.size()) type = 2;
    auto remaining = value;
    const auto &distribution = distributions[type];
    for (std::uint32_t index = 0; index < distribution.size(); ++index) {
        if (distribution[index] == 0) break;
        if (remaining < distribution[index]) return index + 1;
        remaining -= distribution[index];
    }
    return 1;
}
std::uint32_t flute_for(std::uint32_t value) { return value < 40 ? 1 : value < 70 ? 2 : value < 90 ? 3 : 4; }
std::uint32_t item_for(std::uint32_t value) { return value < 50 ? 0 : value < 55 ? 1 : value < 56 ? 2 : 3; }
std::uint32_t pack_patch(std::uint32_t ring, std::uint32_t direction, std::uint32_t location, std::uint32_t state) {
    return ring | (direction << 2) | (location << 4) | (state << 8);
}

bool same_state(const Status &status, const std::array<std::uint32_t, 4> &state) { return status.rng.current() == state; }
std::uint32_t hit_after_delay(const Span &span, std::int64_t current, std::uint32_t method, std::uint32_t party, std::uint32_t delay, std::int32_t cry_frame, bool is_oras, const std::vector<Span> &reference) {
    Status status;
    status.rng.set(span.state);
    status.events = span.events;
    status.frame = current;
    status.remove_fidget();
    if (method == 5) {
        status.elapse(delay);
        status.rng.advance(3 * party);
        status.elapse(132);
        status.elapse(status.rand_n(7) * 30 + 60);
    } else if (method == 6) {
        status.elapse(16);
        status.rng.advance(3);
        status.elapse(static_cast<std::int64_t>(delay) - 228);
        status.rng.next();
        status.elapse(212);
    } else if (method == 10) {
        status.elapse(146);
        status.rng.next();
        if (delay == 324) {
            status.elapse(118); status.rng.next(); status.elapse(60);
        } else status.elapse(180);
        status.rng.advance(3 * party);
        status.elapse(124);
    } else if (cry_frame < 0) status.elapse(delay);
    else {
        status.elapse(static_cast<std::int64_t>(cry_frame));
        status.rng.next();
        status.elapse(static_cast<std::int64_t>(delay) - cry_frame);
    }
    (void)is_oras;
    for (std::uint32_t index = span.index; index < reference.size(); ++index)
        if (same_state(status, reference[index].state)) return index;
    return std::numeric_limits<std::uint32_t>::max();
}

void mark_results(std::vector<Span> &output, const std::vector<Span> &reference, std::uint32_t method, std::uint32_t p1, std::uint32_t p2, bool boost, bool is_oras, std::uint32_t result_limit) {
    const auto take = std::min<std::size_t>(output.size(), result_limit);
    output.resize(take);
    for (auto &span : output) {
        const auto hit = span.hit_index;
        const auto required = method == 1 ? 3 * p1 : (method >= 3 && method <= 8 ? 6U : 0U);
        if (hit >= reference.size() || hit + required >= reference.size()) continue;
        auto at = [&](std::uint32_t offset) -> const Span & { return reference[hit + offset]; };
        std::uint32_t encounter = 0, slot = 0, flute = 0, item = 0, music = 0, horde_ha = 0;
        std::array<std::uint32_t, 5> radar_patches{};
        std::uint32_t sync = 2;
        if (method == 0 || method == 10) sync = at(0).random < 0x80000000U ? 1 : 0;
        if (method == 1) sync = at(3 * p1).random < 0x80000000U ? 1 : 0;
        if (method == 2) {
            Status rng; rng.rng.set(span.state); rng.rng.advance(3 * p1 + (is_oras ? 15 : 27));
            const auto lead = rng.rand_n(100); sync = lead < 50 ? 1 : 0;
            slot = slot_for(rng.rand_n(100), 3);
            if (rng.rand_n(100) < 20) horde_ha = rng.rand_n(5) + 1;
            if (is_oras) for (std::uint32_t i = 0; i < 5; ++i) flute |= flute_for(rng.rand_n(100)) << (i * 3);
            rng.rng.next();
            for (std::uint32_t i = 0; i < 5; ++i) item |= item_for(rng.rand_n(100)) << (i * 2);
        } else if (method == 3 || method == 4 || method == 5 || method == 7 || method == 8 || method == 6) {
            std::uint32_t j = hit;
            if (method == 6) { encounter = rand100(reference[j++].random) % 3; sync = reference[j++].random < 0x80000000U ? 1 : 0; slot = slot_for(rand100(reference[j++].random), 4); }
            else { sync = reference[j++].random < 0x80000000U ? 1 : 0; if (method != 4 && method != 7) encounter = rand100(reference[j++].random); const auto slot_type = method == 3 ? p1 + 47 : method == 5 ? 3 : 2; slot = slot_for(rand100(reference[j++].random), slot_type); }
            if (is_oras) flute = flute_for(rand100(reference[j++].random));
            item = item_for(rand100(reference[j + 1].random));
            if (method == 4) {
                static constexpr std::array<std::uint32_t, 4> good_rate{23, 43, 63, 83};
                Status radar; radar.rng.set(span.state); radar.rng.advance(3 * p1);
                const auto music_roll = radar.rand_n(100);
                const auto boosted = boost && music_roll >= 50;
                music = music_roll < 2 ? 1 : music_roll > 49 ? 2 : 0;
                for (std::uint32_t ring = 0; ring < 4; ++ring) {
                    const auto direction = radar.rand_n(4);
                    const auto location = radar.rand_n(ring * 2 + 3);
                    std::uint32_t patch_state = 0;
                    if (radar.rand_n(100) < good_rate[ring]) {
                        radar.rng.next();
                        const auto chance = boosted || p2 >= 40 ? 100U : 8100U - p2 * 200U;
                        patch_state = static_cast<std::uint64_t>(radar.rng.next()) * chance <= std::numeric_limits<std::uint32_t>::max() ? 2 : 1;
                    }
                    radar_patches[ring] = pack_patch(ring, direction, location, patch_state);
                }
                const auto empty_ring = radar.rand_n(3);
                radar_patches[4] = pack_patch(empty_ring, radar.rand_n(4), radar.rand_n(empty_ring * 2 + 3), 3);
            }
        }
        span.hit_index = span.hit_index;
        Gen6TinyTimelineResult result{};
        result.words[0] = span.index;
        result.words[1] = static_cast<std::uint32_t>(static_cast<std::int32_t>(span.frame_min));
        result.words[2] = static_cast<std::uint32_t>(static_cast<std::int32_t>(span.frame_max));
        result.words[3] = span.hit_index;
        result.words[4] = span.random;
        for (int i = 0; i < 4; ++i) result.words[5 + i] = span.state[i];
        result.words[9] = (music << 16) | (method << 8) | sync;
        result.words[10] = encounter;
        result.words[11] = slot;
        result.words[12] = flute;
        result.words[13] = item;
        if (method == 4) {
            std::uint64_t packed_patches = 0;
            for (std::uint32_t i = 0; i < 5; ++i)
                packed_patches |= static_cast<std::uint64_t>(radar_patches[i]) << (i * 10);
            result.words[14] = static_cast<std::uint32_t>(packed_patches);
            result.words[15] = static_cast<std::uint32_t>(packed_patches >> 32);
        }
        result.words[15] = horde_ha;
        results.push_back(result);
    }
}
}

extern "C" std::uint32_t gen6tinytimeline_api_version() { return api_version; }

extern "C" std::uint32_t gen6tinytimeline_generate(const std::uint32_t *request) {
    results.clear(); processed = 0; limit_reached = 0; error = 0;
    if (!request || request[5] < request[4] || request[5] > max_frame || request[7] < 1 || request[7] > 4 || request[6] > 10 || request[21] == 0 || request[21] > browser_max_results) { error = 1; return 0; }
    const auto start = request[4]; const auto target = request[5]; const auto method = request[6]; const auto event_count = request[7];
    Status timeline; timeline.rng.set({request[0], request[1], request[2], request[3]}); timeline.frame = static_cast<std::int64_t>(start) - 2;
    for (std::uint32_t i = 0; i < event_count; ++i) timeline.add(request[8 + i * 2], request[9 + i * 2]);
    const auto max = std::min<std::uint64_t>(static_cast<std::uint64_t>(target) + 5000, max_frame);
    std::vector<Span> reference; std::uint32_t index = 0;
    while (timeline.frame <= max && !timeline.events.empty()) {
        Span span; span.index = index++; span.state = timeline.rng.current(); span.events = timeline.events; span.frame_min = timeline.frame; span.random = timeline.advance_to_next(); span.frame_max = timeline.frame; reference.push_back(span);
    }
    for (std::uint32_t i = 0; i < 100 && !timeline.events.empty(); ++i) { Span span; span.index = index++; span.state = timeline.rng.current(); span.events = timeline.events; span.frame_min = timeline.frame; span.random = timeline.advance_to_next(); span.frame_max = timeline.frame; reference.push_back(span); }
    std::vector<Span> output;
    const bool consider = (request[18] & 4U) != 0;
    const auto delay = request[19]; const auto cry = request[20] == 0xffffffffU ? -1 : static_cast<std::int32_t>(request[20]);
    if (!consider) { output = reference; for (auto &span : output) span.hit_index = span.index; }
    else {
        std::uint32_t current_mt = start + 2; std::size_t current_index = 0; std::uint32_t hit = std::numeric_limits<std::uint32_t>::max();
        while (current_mt <= target && current_index < reference.size()) {
            while (current_index < reference.size() && (current_mt > reference[current_index].frame_max || reference[current_index].frame_min == reference[current_index].frame_max)) ++current_index;
            if (current_index >= reference.size() || reference[current_index].frame_min > target) break;
            auto &source = reference[current_index];
            auto current_hit = current_mt == source.frame_min + 2 ? hit_after_delay(source, current_mt, method, request[16], delay, cry, (request[18] & 2U) != 0, reference) : hit;
            Span span = source; span.frame_min = current_mt - 2; span.hit_index = current_hit;
            do { current_mt += 2; hit = hit_after_delay(source, current_mt, method, request[16], delay, cry, (request[18] & 2U) != 0, reference); } while (current_mt <= source.frame_max && current_hit == hit);
            span.frame_max = current_mt - 2; output.push_back(span);
        }
    }
    processed = target - start + 1;
    if (output.size() > request[21]) { output.resize(request[21]); limit_reached = 1; }
    const auto is_oras = (request[18] & 2U) != 0 && (method == 2 || method == 5 || method == 6 || method == 8);
    mark_results(output, reference, method, request[16], request[17], (request[18] & 1U) != 0, is_oras, request[21]);
    if (results.size() >= request[21]) limit_reached = 1;
    return static_cast<std::uint32_t>(results.size());
}

extern "C" std::uintptr_t gen6tinytimeline_result_ptr() { return results.empty() ? 0 : reinterpret_cast<std::uintptr_t>(results.data()); }
extern "C" std::uint32_t gen6tinytimeline_result_count() { return static_cast<std::uint32_t>(results.size()); }
extern "C" std::uint32_t gen6tinytimeline_processed_count() { return processed; }
extern "C" std::uint32_t gen6tinytimeline_limit_reached() { return limit_reached; }
extern "C" std::uint32_t gen6tinytimeline_last_error() { return error; }
