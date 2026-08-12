cmake_minimum_required(VERSION 3.31)

project(PokeRNGKitWasm VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(POKERNGKIT_WASM_MODULES "gen3id;gen3initialseed;gen3static;gen3wild;gen3ivtopid" CACHE STRING "Semicolon-separated Wasm modules to build, or all")
set(
    POKERNGKIT_WASM_OUTPUT_DIR
    "${CMAKE_CURRENT_SOURCE_DIR}/../public/wasm"
    CACHE PATH
    "Directory for generated browser Wasm artifacts"
)

set(POKEFINDER_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/../third_party/pokefinder")

function(pokerngkit_add_module module_name)
    if("all" IN_LIST POKERNGKIT_WASM_MODULES OR module_name IN_LIST POKERNGKIT_WASM_MODULES)
        add_subdirectory("modules/${module_name}")
    endif()
endfunction()

include(CTest)

pokerngkit_add_module(gen3id)
pokerngkit_add_module(gen3initialseed)
pokerngkit_add_module(gen3static)
pokerngkit_add_module(gen3wild)
pokerngkit_add_module(gen3ivtopid)
