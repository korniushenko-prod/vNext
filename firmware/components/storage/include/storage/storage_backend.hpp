#pragma once

#include <map>
#include <optional>
#include <string>
#include <vector>

#include "storage/storage_types.hpp"

namespace controller::storage {

class StorageBackend {
 public:
  virtual ~StorageBackend() = default;

  virtual std::optional<ByteBuffer> read_record(const std::string& key) const = 0;
  virtual bool write_record(const std::string& key, const ByteBuffer& bytes) = 0;
  virtual bool erase_record(const std::string& key) = 0;
  virtual bool record_exists(const std::string& key) const = 0;
  virtual std::vector<std::string> list_record_keys() const = 0;
};

class InMemoryStorageBackend final : public StorageBackend {
 public:
  std::optional<ByteBuffer> read_record(const std::string& key) const override;
  bool write_record(const std::string& key, const ByteBuffer& bytes) override;
  bool erase_record(const std::string& key) override;
  bool record_exists(const std::string& key) const override;
  std::vector<std::string> list_record_keys() const override;
  void inject_record(const std::string& key, ByteBuffer bytes);

 private:
  std::map<std::string, ByteBuffer> records_;
};

}  // namespace controller::storage
