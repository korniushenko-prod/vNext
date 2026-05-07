#include <iostream>
#include <set>

#include "mqtt/mqtt_topic_mapper.hpp"
#include "mqtt_test_support.hpp"

int main() {
  using namespace mqtt_test;

  const controller::mqtt::MqttTopicMapper mapper("plant/controller/");

  expect_true(
      mapper.sequence_active_program_id() == "plant/controller/sequence/active_program_id",
      "sequence active program topic should be deterministic");
  expect_true(
      mapper.cmd_program_start() == "plant/controller/cmd/program/start",
      "program start command topic should be deterministic");
  expect_true(
      mapper.cmd_flow_batch_start("flow1") == "plant/controller/cmd/flow/flow1/batch/start",
      "flow batch start topic should include the flow id");
  expect_true(
      mapper.cmd_pid_integral_reset("loop1") == "plant/controller/cmd/pid/loop1/integral/reset",
      "pid integral reset topic should include the pid id");
  expect_true(
      mapper.availability_topic() == "plant/controller/availability",
      "default availability topic should live under the prefix");
  expect_true(
      controller::mqtt::MqttTopicMapper::normalize_topic("/plant/controller/") == "plant/controller",
      "normalize_topic should strip leading and trailing slashes");

  const auto parsed = mapper.parse_command_topic("plant/controller/cmd/pid/loop1/manual_output");
  expect_true(parsed.ok(), "known command topic should parse successfully");
  expect_true(
      parsed.ok() && parsed.value->entity_id == "loop1",
      "parsed pid command should expose the target id");

  const auto command_topics = mapper.command_topics({"flow1", "flow2"}, {"loop1"});
  const std::set<std::string> unique_topics(command_topics.begin(), command_topics.end());
  expect_true(
      command_topics.size() == unique_topics.size(),
      "explicit command topic generation should not create duplicates");
  expect_true(
      unique_topics.count("plant/controller/cmd/flow/flow2/trip/reset") == 1U,
      "command topic generation should include flow trip reset");
  expect_true(
      unique_topics.count("plant/controller/cmd/pid/loop1/mode") == 1U,
      "command topic generation should include pid mode");

  if (failures != 0) {
    std::cerr << "test_mqtt_topic_mapper failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_mqtt_topic_mapper passed\n";
  return 0;
}
