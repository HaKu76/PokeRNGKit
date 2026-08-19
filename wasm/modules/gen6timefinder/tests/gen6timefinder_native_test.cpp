#include "gen6timefinder_bridge.h"
#include <cassert>
int main() {
  assert(gen6timefinder_api_version() == 1);
  assert(gen6timefinder_initial_seed(1, 2, 3, 4) == 6);
  assert(gen6timefinder_initial_seed(0xffffffffU, 1, 0, 0) == 0);
  return 0;
}
