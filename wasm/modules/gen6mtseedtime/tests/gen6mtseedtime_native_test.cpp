#include "gen6mtseedtime_bridge.h"
#include <cassert>
#include <cstdint>
int main() {
  assert(gen6mtseedtime_api_version() == 1);
  const std::uint32_t request[] = {1, 1, 0, 0, 0, 0, 0, 0, 1, 10};
  assert(gen6mtseedtime_begin(request) == 1);
  assert(gen6mtseedtime_step(1) == 0);
  assert(gen6mtseedtime_done() == 1);
  assert(gen6mtseedtime_result_count() == 0);
  const std::uint32_t invalid[] = {0, 1, 0, 0, 0, 1, 0, 0, 1, 10};
  assert(gen6mtseedtime_begin(invalid) == 0);
  assert(gen6mtseedtime_last_error() == 1);
}
